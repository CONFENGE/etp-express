import { DataSource, In } from 'typeorm';
import { config } from 'dotenv';
import { Organization } from '../src/entities/organization.entity';
import { User } from '../src/entities/user.entity';
import { Etp, EtpStatus } from '../src/entities/etp.entity';
import { EtpSection } from '../src/entities/etp-section.entity';
import { EtpVersion } from '../src/entities/etp-version.entity';
import { AuditLog } from '../src/entities/audit-log.entity';

config();

/**
 * Standalone script for resetting demo organization data.
 *
 * This script can be executed manually or via cron job outside of the NestJS application.
 * It provides the same functionality as DemoService.resetDemoData() but can run independently.
 *
 * Usage:
 *   npm run reset:demo
 *   npx ts-node -r tsconfig-paths/register scripts/reset-demo-data.ts
 *
 * @see Issue #474 - Implementar isolamento e reset periódico de dados demo
 */

const DEMO_ORGANIZATION_CNPJ = '00.000.000/0002-00';

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

async function resetDemoData(): Promise<void> {
  console.log('🔄 Starting demo data reset script...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Organization, User, Etp, EtpSection, EtpVersion, AuditLog],
    synchronize: false,
    logging: false,
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const organizationRepository = dataSource.getRepository(Organization);
    const userRepository = dataSource.getRepository(User);
    const etpRepository = dataSource.getRepository(Etp);
    const sectionRepository = dataSource.getRepository(EtpSection);
    const versionRepository = dataSource.getRepository(EtpVersion);
    const auditLogRepository = dataSource.getRepository(AuditLog);

    // 1. Find demo organization
    const demoOrg = await organizationRepository.findOne({
      where: { cnpj: DEMO_ORGANIZATION_CNPJ },
    });

    if (!demoOrg) {
      console.error(
        `❌ Demo organization not found (CNPJ: ${DEMO_ORGANIZATION_CNPJ})`,
      );
      console.log(
        '   Please run seed:admin first to create demo organization.',
      );
      process.exit(1);
    }

    console.log(
      `📍 Demo organization found: ${demoOrg.name} (ID: ${demoOrg.id})`,
    );

    // 2. Find demo user
    const demoUser = await userRepository.findOne({
      where: { organizationId: demoOrg.id },
    });

    if (!demoUser) {
      console.error(`❌ Demo user not found for organization ${demoOrg.id}`);
      console.log('   Please run seed:admin first to create demo user.');
      process.exit(1);
    }

    console.log(`👤 Demo user found: ${demoUser.email} (ID: ${demoUser.id})`);

    // Start transaction
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Get all ETPs from demo organization
      const demoEtps = await etpRepository.find({
        where: { organizationId: demoOrg.id },
        select: ['id'],
      });

      const etpIds = demoEtps.map((etp) => etp.id);
      console.log(`📋 Found ${etpIds.length} ETPs to delete`);

      let deletedAuditLogs = 0;
      let deletedVersions = 0;
      let deletedSections = 0;
      let deletedEtps = 0;

      if (etpIds.length > 0) {
        // 4. Delete audit logs
        const auditLogsResult = await queryRunner.manager.delete(AuditLog, {
          etpId: In(etpIds),
        });
        deletedAuditLogs = auditLogsResult.affected || 0;
        console.log(`   🗑️  Deleted ${deletedAuditLogs} audit logs`);

        // 5. Delete versions
        const versionsResult = await queryRunner.manager.delete(EtpVersion, {
          etpId: In(etpIds),
        });
        deletedVersions = versionsResult.affected || 0;
        console.log(`   🗑️  Deleted ${deletedVersions} versions`);

        // 6. Delete sections
        const sectionsResult = await queryRunner.manager.delete(EtpSection, {
          etpId: In(etpIds),
        });
        deletedSections = sectionsResult.affected || 0;
        console.log(`   🗑️  Deleted ${deletedSections} sections`);

        // 7. Delete ETPs
        const etpsResult = await queryRunner.manager.delete(Etp, {
          organizationId: demoOrg.id,
        });
        deletedEtps = etpsResult.affected || 0;
        console.log(`   🗑️  Deleted ${deletedEtps} ETPs`);
      }

      // 8. Recreate sample ETPs
      console.log('\n📝 Creating sample ETPs...');
      let createdEtps = 0;

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
        console.log(`   ✅ Created: ${sampleEtp.title}`);
      }

      await queryRunner.commitTransaction();

      console.log('\n📊 Summary:');
      console.log(`   Deleted ETPs: ${deletedEtps}`);
      console.log(`   Deleted Sections: ${deletedSections}`);
      console.log(`   Deleted Versions: ${deletedVersions}`);
      console.log(`   Deleted Audit Logs: ${deletedAuditLogs}`);
      console.log(`   Created ETPs: ${createdEtps}`);

      console.log('\n🎉 Demo data reset completed successfully!');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Transaction rolled back due to error:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('❌ Error during demo reset:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run script
resetDemoData()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
