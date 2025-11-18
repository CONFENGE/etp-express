import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface PerplexitySearchResult {
  title: string;
  snippet: string;
  url?: string;
  relevance: number;
  source: string;
}

export interface PerplexityResponse {
  results: PerplexitySearchResult[];
  summary: string;
  sources: string[];
}

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl = 'https://api.perplexity.ai/chat/completions';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('PERPLEXITY_API_KEY') || '';
    this.model = this.configService.get<string>(
      'PERPLEXITY_MODEL',
      'pplx-7b-online',
    );
  }

  async search(query: string): Promise<PerplexityResponse> {
    this.logger.log(`Searching with Perplexity: ${query}`);

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'Você é um assistente especializado em encontrar informações sobre contratações públicas brasileiras. Forneça informações precisas e cite as fontes.',
            },
            {
              role: 'user',
              content: query,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const content = response.data.choices[0]?.message?.content || '';
      const citations = response.data.citations || [];

      // Parse results from content
      const results = this.parseResults(content, citations);

      this.logger.log(
        `Perplexity search completed. Found ${results.length} results`,
      );

      return {
        results,
        summary: content,
        sources: citations,
      };
    } catch (error) {
      this.logger.error('Perplexity API failed', { query, error: error.message });
      throw new ServiceUnavailableException(
        'Busca externa temporariamente indisponível. Tente novamente em alguns minutos.'
      );
    }
  }

  private parseResults(
    content: string,
    citations: string[],
  ): PerplexitySearchResult[] {
    const results: PerplexitySearchResult[] = [];

    // Try to extract structured information from content
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    citations.forEach((citation, index) => {
      results.push({
        title: `Fonte ${index + 1}`,
        snippet: lines[index] || citation,
        url: citation.startsWith('http') ? citation : undefined,
        relevance: 1 - index * 0.1,
        source: 'Perplexity AI',
      });
    });

    return results;
  }

  async searchSimilarContracts(
    objeto: string,
    _filters?: any,
  ): Promise<PerplexityResponse> {
    const query = `Busque informações sobre contratações públicas similares a: "${objeto}".
    Inclua informações sobre:
    - Órgãos que realizaram contratações similares
    - Valores praticados
    - Modalidades utilizadas
    - Links para processos ou documentos relacionados

    Foque em dados do Brasil e cite as fontes oficiais.`;

    return this.search(query);
  }

  async searchLegalReferences(topic: string): Promise<PerplexityResponse> {
    const query = `Busque informações sobre a base legal para: "${topic}" no contexto de contratações públicas brasileiras.
    Inclua referências a:
    - Lei 14.133/2021
    - Instruções Normativas da SEGES
    - Jurisprudência do TCU
    - Outros normativos aplicáveis

    Cite as fontes oficiais e artigos específicos quando possível.`;

    return this.search(query);
  }
}
