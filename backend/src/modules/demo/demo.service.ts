import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { Etp, EtpStatus } from '../../entities/etp.entity';
import { EtpSection } from '../../entities/etp-section.entity';
import { EtpVersion } from '../../entities/etp-version.entity';
import { AuditLog } from '../../entities/audit-log.entity';

/**
 * Demo CNPJ - Used to identify the demo organization.
 * Defined in seed-admin.ts as '00.000.000/0002-00'
 */
const DEMO_ORGANIZATION_CNPJ = '00.000.000/0002-00';

/**
 * Sample ETPs to be recreated after each reset.
 * These provide realistic examples for demo users to explore.
 */
const SAMPLE_ETPS = [
  {
    title: 'Aquisição de Computadores e Equipamentos de TI',
    objeto:
      'Compra de equipamentos de tecnologia da informação para modernização do parque tecnológico da instituição',
    description: 'ETP modelo para demonstração de aquisição de bens de TI',
    numeroProcesso: 'DEMO-001/2025',
    valorEstimado: 150000.0,
    status: EtpStatus.IN_PROGRESS,
    metadata: {
      unidadeRequisitante: 'Departamento de TI',
      responsavelTecnico: 'Usuário Demo',
      fundamentacaoLegal: ['Lei 14.133/2021', 'IN SEGES/ME nº 65/2021'],
      tags: ['TI', 'Equipamentos', 'Modernização'],
    },
  },
  {
    title: 'Contratação de Serviços de Limpeza e Conservação',
    objeto:
      'Prestação de serviços terceirizados de limpeza, conservação e higienização das instalações',
    description:
      'ETP modelo para demonstração de contratação de serviços continuados',
    numeroProcesso: 'DEMO-002/2025',
    valorEstimado: 480000.0,
    status: EtpStatus.DRAFT,
    metadata: {
      unidadeRequisitante: 'Setor de Administração',
      responsavelTecnico: 'Usuário Demo',
      fundamentacaoLegal: ['Lei 14.133/2021', 'IN SEGES/ME nº 5/2017'],
      tags: ['Serviços', 'Terceirização', 'Continuado'],
    },
  },
  {
    title: 'Reforma e Adequação de Prédio Público',
    objeto:
      'Execução de obras de engenharia para reforma e adequação das instalações físicas do órgão',
    description: 'ETP modelo para demonstração de contratação de obras',
    numeroProcesso: 'DEMO-003/2025',
    valorEstimado: 1200000.0,
    status: EtpStatus.REVIEW,
    metadata: {
      unidadeRequisitante: 'Divisão de Engenharia',
      responsavelTecnico: 'Usuário Demo',
      fundamentacaoLegal: ['Lei 14.133/2021', 'Decreto 7.983/2013'],
      tags: ['Obras', 'Engenharia', 'Infraestrutura'],
    },
  },
];

/**
 * Demo Data Reset Result
 */
export interface DemoResetResult {
  success: boolean;
  timestamp: Date;
  deletedEtps: number;
  deletedSections: number;
  deletedVersions: number;
  deletedAuditLogs: number;
  createdEtps: number;
  /** @see Issue #1341 - Indicates if org was reactivated */
  organizationReactivated?: boolean;
  /** @see Issue #1341 - Indicates if user was reactivated */
  userReactivated?: boolean;
  error?: string;
}

/**
 * Demo Service - Gerenciamento de dados demo isolados (#474)
 *
 * Responsabilidades:
 * - Identificar organização demo pelo CNPJ '00.000.000/0002-00'
 * - Executar reset diário às 00:00 UTC (cron job)
 * - Deletar todos os dados associados à organização demo
 * - Recriar ETPs de exemplo após cada reset
 * - Fornecer endpoint para reset manual (SYSTEM_ADMIN only)
 *
 * Isolamento garantido por:
 * - Filtro por organizationId em todas as operações
 * - Transação atômica para evitar estados inconsistentes
 * - Logs de auditoria para todas as operações de reset
 */
@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Etp)
    private readonly etpRepository: Repository<Etp>,
    @InjectRepository(EtpSection)
    private readonly sectionRepository: Repository<EtpSection>,
    @InjectRepository(EtpVersion)
    private readonly versionRepository: Repository<EtpVersion>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Busca a organização demo pelo CNPJ.
   *
   * @returns Organization ou null se não encontrada
   */
  async findDemoOrganization(): Promise<Organization | null> {
    return this.organizationRepository.findOne({
      where: { cnpj: DEMO_ORGANIZATION_CNPJ },
    });
  }

  /**
   * Ensures the demo organization is active (isActive = true).
   *
   * This method is called during resetDemoData() to prevent 403 errors
   * when the demo user tries to access the system. If the organization
   * was accidentally suspended, this will reactivate it.
   *
   * @see Issue #1341 - Demo user cannot create ETPs due to 403 error
   * @param organization - The demo organization to ensure is active
   * @returns true if organization was reactivated, false if already active
   */
  async ensureDemoOrganizationActive(
    organization: Organization,
  ): Promise<boolean> {
    if (organization.isActive) {
      return false;
    }

    this.logger.warn(
      `Demo organization was INACTIVE. Reactivating to prevent 403 errors. (ID: ${organization.id})`,
    );

    organization.isActive = true;
    await this.organizationRepository.save(organization);

    this.logger.log(
      `Demo organization reactivated successfully (ID: ${organization.id})`,
    );

    return true;
  }

  /**
   * Ensures the demo user is active (isActive = true).
   *
   * @see Issue #1341 - Demo user cannot create ETPs due to 403 error
   * @param user - The demo user to ensure is active
   * @returns true if user was reactivated, false if already active
   */
  async ensureDemoUserActive(user: User): Promise<boolean> {
    if (user.isActive) {
      return false;
    }

    this.logger.warn(
      `Demo user was INACTIVE. Reactivating to prevent 403 errors. (Email: ${user.email})`,
    );

    user.isActive = true;
    await this.userRepository.save(user);

    this.logger.log(
      `Demo user reactivated successfully (Email: ${user.email})`,
    );

    return true;
  }

  /**
   * Busca o usuário demo da organização.
   *
   * @param organizationId - ID da organização demo
   * @returns User ou null se não encontrado
   */
  async findDemoUser(organizationId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { organizationId },
    });
  }

  /**
   * Cron Job - Reset diário de dados demo às 00:00 UTC
   *
   * Executa diariamente à meia-noite para garantir que:
   * 1. Dados demo não acumulem indefinidamente
   * 2. Novos usuários demo sempre vejam exemplos limpos
   * 3. Dados sensíveis inseridos por usuários demo sejam removidos
   *
   * @cron Executa diariamente às 00:00 UTC (EVERY_DAY_AT_MIDNIGHT)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDemoReset(): Promise<void> {
    this.logger.log('Starting scheduled demo data reset...');

    try {
      const result = await this.resetDemoData();

      if (result.success) {
        this.logger.log('Scheduled demo data reset completed successfully', {
          deletedEtps: result.deletedEtps,
          deletedSections: result.deletedSections,
          deletedVersions: result.deletedVersions,
          deletedAuditLogs: result.deletedAuditLogs,
          createdEtps: result.createdEtps,
        });
      } else {
        this.logger.error('Scheduled demo data reset failed', {
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('Unexpected error during scheduled demo reset', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Executa reset completo dos dados demo.
   *
   * Operações (em transação):
   * 1. Busca organização demo pelo CNPJ
   * 2. Garante que organização e usuário demo estão ativos (Issue #1341)
   * 3. Busca todos os ETPs da organização
   * 4. Deleta audit logs, versions, sections, e ETPs
   * 5. Recria ETPs de exemplo
   *
   * @returns DemoResetResult com estatísticas da operação
   */
  async resetDemoData(): Promise<DemoResetResult> {
    const timestamp = new Date();

    // Buscar organização demo
    const demoOrg = await this.findDemoOrganization();

    if (!demoOrg) {
      this.logger.warn('Demo organization not found. Skipping reset.');
      return {
        success: false,
        timestamp,
        deletedEtps: 0,
        deletedSections: 0,
        deletedVersions: 0,
        deletedAuditLogs: 0,
        createdEtps: 0,
        error:
          'Demo organization not found (CNPJ: ' + DEMO_ORGANIZATION_CNPJ + ')',
      };
    }

    // Issue #1341: Ensure demo organization is active to prevent 403 errors
    const organizationReactivated =
      await this.ensureDemoOrganizationActive(demoOrg);

    // Buscar usuário demo para atribuir os ETPs de exemplo
    const demoUser = await this.findDemoUser(demoOrg.id);

    if (!demoUser) {
      this.logger.warn('Demo user not found. Skipping reset.');
      return {
        success: false,
        timestamp,
        deletedEtps: 0,
        deletedSections: 0,
        deletedVersions: 0,
        deletedAuditLogs: 0,
        createdEtps: 0,
        organizationReactivated,
        error: 'Demo user not found for organization ' + demoOrg.id,
      };
    }

    // Issue #1341: Ensure demo user is active to prevent 403 errors
    const userReactivated = await this.ensureDemoUserActive(demoUser);

    // Executar em transação para garantir consistência
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let deletedEtps = 0;
    let deletedSections = 0;
    let deletedVersions = 0;
    let deletedAuditLogs = 0;
    let createdEtps = 0;

    try {
      // 1. Buscar todos os ETPs da organização demo
      const demoEtps = await this.etpRepository.find({
        where: { organizationId: demoOrg.id },
        select: ['id'],
      });

      const etpIds = demoEtps.map((etp) => etp.id);

      if (etpIds.length > 0) {
        // 2. Deletar audit logs associados aos ETPs
        const auditLogsResult = await queryRunner.manager.delete(AuditLog, {
          etpId: In(etpIds),
        });
        deletedAuditLogs = auditLogsResult.affected || 0;

        // 3. Deletar versions associadas aos ETPs
        const versionsResult = await queryRunner.manager.delete(EtpVersion, {
          etpId: In(etpIds),
        });
        deletedVersions = versionsResult.affected || 0;

        // 4. Deletar sections associadas aos ETPs
        const sectionsResult = await queryRunner.manager.delete(EtpSection, {
          etpId: In(etpIds),
        });
        deletedSections = sectionsResult.affected || 0;

        // 5. Deletar os ETPs
        const etpsResult = await queryRunner.manager.delete(Etp, {
          organizationId: demoOrg.id,
        });
        deletedEtps = etpsResult.affected || 0;
      }

      // 6. Recriar ETPs de exemplo
      for (const sampleEtp of SAMPLE_ETPS) {
        const newEtp = queryRunner.manager.create(Etp, {
          ...sampleEtp,
          organizationId: demoOrg.id,
          createdById: demoUser.id,
          currentVersion: 1,
          completionPercentage: 0,
        });
        await queryRunner.manager.save(newEtp);
        createdEtps++;
      }

      await queryRunner.commitTransaction();

      this.logger.log('Demo data reset transaction committed', {
        organizationId: demoOrg.id,
        deletedEtps,
        deletedSections,
        deletedVersions,
        deletedAuditLogs,
        createdEtps,
      });

      return {
        success: true,
        timestamp,
        deletedEtps,
        deletedSections,
        deletedVersions,
        deletedAuditLogs,
        createdEtps,
        organizationReactivated,
        userReactivated,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Demo data reset transaction rolled back', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        timestamp,
        deletedEtps: 0,
        deletedSections: 0,
        deletedVersions: 0,
        deletedAuditLogs: 0,
        createdEtps: 0,
        organizationReactivated,
        userReactivated,
        error: error.message,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Retorna estatísticas da organização demo.
   *
   * @returns Objeto com contagem de ETPs, Sections, Users
   */
  async getDemoStatistics(): Promise<{
    organizationId: string | null;
    organizationName: string | null;
    etpCount: number;
    userCount: number;
    lastResetInfo: string;
  }> {
    const demoOrg = await this.findDemoOrganization();

    if (!demoOrg) {
      return {
        organizationId: null,
        organizationName: null,
        etpCount: 0,
        userCount: 0,
        lastResetInfo: 'Demo organization not configured',
      };
    }

    const etpCount = await this.etpRepository.count({
      where: { organizationId: demoOrg.id },
    });

    const userCount = await this.userRepository.count({
      where: { organizationId: demoOrg.id },
    });

    return {
      organizationId: demoOrg.id,
      organizationName: demoOrg.name,
      etpCount,
      userCount,
      lastResetInfo: 'Resets daily at 00:00 UTC',
    };
  }
}
