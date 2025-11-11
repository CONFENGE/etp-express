import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Etp, EtpStatus } from "../../entities/etp.entity";
import { CreateEtpDto } from "./dto/create-etp.dto";
import { UpdateEtpDto } from "./dto/update-etp.dto";
import {
  PaginationDto,
  createPaginatedResult,
} from "../../common/dto/pagination.dto";

@Injectable()
export class EtpsService {
  private readonly logger = new Logger(EtpsService.name);

  constructor(
    @InjectRepository(Etp)
    private etpsRepository: Repository<Etp>,
  ) {}

  async create(createEtpDto: CreateEtpDto, userId: string): Promise<Etp> {
    const etp = this.etpsRepository.create({
      ...createEtpDto,
      createdById: userId,
      status: EtpStatus.DRAFT,
      currentVersion: 1,
      completionPercentage: 0,
    });

    const savedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP created: ${savedEtp.id} by user ${userId}`);

    return savedEtp;
  }

  async findAll(paginationDto: PaginationDto, userId?: string) {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.etpsRepository
      .createQueryBuilder("etp")
      .leftJoinAndSelect("etp.createdBy", "user");

    if (userId) {
      queryBuilder.where("etp.createdById = :userId", { userId });
    }

    const [etps, total] = await queryBuilder
      .orderBy("etp.updatedAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return createPaginatedResult(etps, total, page, limit);
  }

  async findOne(id: string, userId?: string): Promise<Etp> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ["createdBy", "sections", "versions"],
      order: {
        sections: { order: "ASC" },
        versions: { createdAt: "DESC" },
      },
    });

    if (!etp) {
      throw new NotFoundException(`ETP com ID ${id} não encontrado`);
    }

    // Optional: Check ownership
    if (userId && etp.createdById !== userId) {
      // You might want to implement role-based access here
      // For now, we'll allow viewing but log it
      this.logger.warn(
        `User ${userId} accessed ETP ${id} owned by ${etp.createdById}`,
      );
    }

    return etp;
  }

  async update(
    id: string,
    updateEtpDto: UpdateEtpDto,
    userId: string,
  ): Promise<Etp> {
    const etp = await this.findOne(id);

    // Check ownership
    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para editar este ETP",
      );
    }

    Object.assign(etp, updateEtpDto);

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP updated: ${id} by user ${userId}`);

    return updatedEtp;
  }

  async updateStatus(
    id: string,
    status: EtpStatus,
    userId: string,
  ): Promise<Etp> {
    const etp = await this.findOne(id);

    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para alterar o status deste ETP",
      );
    }

    etp.status = status;

    const updatedEtp = await this.etpsRepository.save(etp);
    this.logger.log(`ETP status updated: ${id} to ${status} by user ${userId}`);

    return updatedEtp;
  }

  async updateCompletionPercentage(id: string): Promise<void> {
    const etp = await this.etpsRepository.findOne({
      where: { id },
      relations: ["sections"],
    });

    if (!etp) {
      return;
    }

    const totalSections = etp.sections.length;
    if (totalSections === 0) {
      etp.completionPercentage = 0;
    } else {
      const completedSections = etp.sections.filter(
        (s) =>
          s.status === "generated" ||
          s.status === "reviewed" ||
          s.status === "approved",
      ).length;
      etp.completionPercentage = (completedSections / totalSections) * 100;
    }

    await this.etpsRepository.save(etp);
  }

  async remove(id: string, userId: string): Promise<void> {
    const etp = await this.findOne(id);

    if (etp.createdById !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para deletar este ETP",
      );
    }

    await this.etpsRepository.remove(etp);
    this.logger.log(`ETP deleted: ${id} by user ${userId}`);
  }

  async getStatistics(userId?: string) {
    const queryBuilder = this.etpsRepository.createQueryBuilder("etp");

    if (userId) {
      queryBuilder.where("etp.createdById = :userId", { userId });
    }

    const total = await queryBuilder.getCount();

    const byStatus = await queryBuilder
      .select("etp.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("etp.status")
      .getRawMany();

    const avgCompletion = await queryBuilder
      .select("AVG(etp.completionPercentage)", "avgCompletion")
      .getRawOne();

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      averageCompletion: parseFloat(
        avgCompletion?.avgCompletion || "0",
      ).toFixed(2),
    };
  }
}
