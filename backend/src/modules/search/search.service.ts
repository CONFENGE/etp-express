import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SimilarContract } from "../../entities/similar-contract.entity";
import { PerplexityService } from "./perplexity/perplexity.service";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(SimilarContract)
    private contractsRepository: Repository<SimilarContract>,
    private perplexityService: PerplexityService,
  ) {}

  async searchSimilarContracts(query: string, filters?: any) {
    this.logger.log(`Searching similar contracts for: ${query}`);

    // First, check if we have cached results
    const cachedResults = await this.getCachedResults(query);

    if (cachedResults.length > 0) {
      this.logger.log(`Found ${cachedResults.length} cached results`);
      return {
        data: cachedResults,
        source: "cache",
        disclaimer:
          "O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
      };
    }

    // If no cache, search with Perplexity
    const perplexityResults =
      await this.perplexityService.searchSimilarContracts(query, filters);

    // Save results to database
    const savedContracts = await this.saveSearchResults(
      query,
      perplexityResults,
    );

    return {
      data: savedContracts,
      summary: perplexityResults.summary,
      sources: perplexityResults.sources,
      source: "perplexity",
      disclaimer:
        "O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
    };
  }

  async searchLegalReferences(topic: string) {
    this.logger.log(`Searching legal references for: ${topic}`);

    const perplexityResults =
      await this.perplexityService.searchLegalReferences(topic);

    return {
      data: perplexityResults.results,
      summary: perplexityResults.summary,
      sources: perplexityResults.sources,
      disclaimer:
        "O ETP Express pode cometer erros. Lembre-se de verificar todas as informações antes de realizar qualquer encaminhamento.",
    };
  }

  private async getCachedResults(query: string): Promise<SimilarContract[]> {
    // Search for cached results (case-insensitive, within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.contractsRepository
      .createQueryBuilder("contract")
      .where("LOWER(contract.searchQuery) = LOWER(:query)", { query })
      .andWhere("contract.createdAt > :date", { date: thirtyDaysAgo })
      .orderBy("contract.relevanceScore", "DESC")
      .limit(10)
      .getMany();
  }

  private async saveSearchResults(
    query: string,
    perplexityResults: any,
  ): Promise<SimilarContract[]> {
    const contracts: SimilarContract[] = [];

    for (const result of perplexityResults.results) {
      const contract = this.contractsRepository.create({
        searchQuery: query,
        title: result.title,
        description: result.snippet,
        url: result.url,
        fonte: result.source,
        relevanceScore: result.relevance,
        metadata: {
          perplexityResult: true,
        },
      });

      const saved = await this.contractsRepository.save(contract);
      contracts.push(saved);
    }

    this.logger.log(`Saved ${contracts.length} contracts to database`);

    return contracts;
  }

  async getContractById(id: string): Promise<SimilarContract | null> {
    return this.contractsRepository.findOne({ where: { id } });
  }

  async getAllContracts(limit: number = 50) {
    return this.contractsRepository.find({
      order: { createdAt: "DESC", relevanceScore: "DESC" },
      take: limit,
    });
  }
}
