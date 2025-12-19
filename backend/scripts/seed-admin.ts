import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import { AuthorizedDomain } from '../src/entities/authorized-domain.entity';
import { Etp } from '../src/entities/etp.entity';
import { EtpSection } from '../src/entities/etp-section.entity';
import { EtpVersion } from '../src/entities/etp-version.entity';
import { AuditLog } from '../src/entities/audit-log.entity';
import { AnalyticsEvent } from '../src/entities/analytics-event.entity';
import { Legislation } from '../src/entities/legislation.entity';
import { SectionTemplate } from '../src/entities/section-template.entity';
import { SecretAccessLog } from '../src/entities/secret-access-log.entity';
import { SimilarContract } from '../src/entities/similar-contract.entity';
import { GovContract } from '../src/entities/gov-contract.entity';
import { PasswordReset } from '../src/entities/password-reset.entity';
import { SicroItem } from '../src/entities/sicro-item.entity';
import { SinapiItem } from '../src/entities/sinapi-item.entity';

config();

/**
 * Seed script for initial admin users (M8: Gestão de Domínios Institucionais).
 * Creates master admin (System Admin) and demo user with their respective organizations.
 *
 * Users Created:
 * - tiago@confenge.com.br (SYSTEM_ADMIN) - Global master administrator
 * - demoetp@confenge.com.br (DEMO) - Demo user with isolated data
 *
 * Usage: npm run seed:admin
 *
 * @see Issue #469 - Criar seed script para usuários iniciais
 */

const BCRYPT_ROUNDS = 10;

const ADMIN_DATA = {
  organization: {
    name: 'CONFENGE Administração',
    cnpj: '00.000.000/0001-00',
    domainWhitelist: ['confenge.com.br'],
    isActive: true,
  },
  user: {
    email: 'tiago@confenge.com.br',
    password: 'Crj70011!',
    name: 'Tiago Sasaki',
    role: UserRole.SYSTEM_ADMIN,
    mustChangePassword: false,
  },
  authorizedDomain: {
    domain: 'confenge.com.br',
    institutionName: 'CONFENGE Administração',
    maxUsers: 100,
    isActive: true,
  },
};

const DEMO_DATA = {
  organization: {
    name: 'Demonstração ETP Express',
    cnpj: '00.000.000/0002-00',
    domainWhitelist: ['demo.etpexpress.com.br'],
    isActive: true,
  },
  user: {
    email: 'demoetp@confenge.com.br',
    password: 'teste2026',
    name: 'Usuário Demo',
    role: UserRole.DEMO,
    mustChangePassword: false,
  },
  authorizedDomain: {
    domain: 'demo.etpexpress.com.br',
    institutionName: 'Demonstração ETP Express',
    maxUsers: 1,
    isActive: true,
  },
};

async function seedAdmin(): Promise<void> {
  console.log('Starting admin seed script...');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      User,
      Organization,
      AuthorizedDomain,
      Etp,
      EtpSection,
      EtpVersion,
      AuditLog,
      AnalyticsEvent,
      Legislation,
      SectionTemplate,
      SecretAccessLog,
      SimilarContract,
      GovContract,
      PasswordReset,
      SicroItem,
      SinapiItem,
    ],
    synchronize: false,
    logging: false,
    // SSL Configuration (#598) - Use ssl: true for proper certificate validation
    ssl: process.env.NODE_ENV === 'production' ? true : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const organizationRepository = dataSource.getRepository(Organization);
    const userRepository = dataSource.getRepository(User);
    const authorizedDomainRepository =
      dataSource.getRepository(AuthorizedDomain);

    // Create Admin Organization and User
    const adminResult = await createAdminUser(
      organizationRepository,
      userRepository,
      authorizedDomainRepository,
    );

    // Create Demo Organization and User
    const demoResult = await createDemoUser(
      organizationRepository,
      userRepository,
      authorizedDomainRepository,
    );

    console.log('\nSummary:');
    console.log('   Admin Organization:', adminResult.organizationStatus);
    console.log('   Admin User:', adminResult.userStatus);
    console.log('   Admin Domain:', adminResult.domainStatus);
    console.log('   Demo Organization:', demoResult.organizationStatus);
    console.log('   Demo User:', demoResult.userStatus);
    console.log('   Demo Domain:', demoResult.domainStatus);

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

interface SeedResult {
  organizationStatus: string;
  userStatus: string;
  domainStatus: string;
}

async function createAdminUser(
  organizationRepository: ReturnType<DataSource['getRepository']>,
  userRepository: ReturnType<DataSource['getRepository']>,
  authorizedDomainRepository: ReturnType<DataSource['getRepository']>,
): Promise<SeedResult> {
  console.log('\nCreating admin user...');

  // Check if admin organization exists
  let adminOrg = await organizationRepository.findOne({
    where: { cnpj: ADMIN_DATA.organization.cnpj },
  });

  let organizationStatus: string;
  if (adminOrg) {
    organizationStatus = 'Already exists (skipped)';
    console.log('⚠️ Admin organization already exists. Skipping creation.');
  } else {
    adminOrg = await organizationRepository.save(
      organizationRepository.create(ADMIN_DATA.organization),
    );
    organizationStatus = `Created (ID: ${adminOrg.id})`;
    console.log(`✅ Admin organization created: ${adminOrg.id}`);
  }

  // Check if authorized domain exists
  let adminDomain = await authorizedDomainRepository.findOne({
    where: { domain: ADMIN_DATA.authorizedDomain.domain },
  });

  let domainStatus: string;
  if (adminDomain) {
    domainStatus = 'Already exists (skipped)';
    console.log(
      '⚠️ Admin authorized domain already exists. Skipping creation.',
    );
  } else {
    adminDomain = await authorizedDomainRepository.save(
      authorizedDomainRepository.create({
        ...ADMIN_DATA.authorizedDomain,
        organizationId: adminOrg.id,
      }),
    );
    domainStatus = `Created (ID: ${adminDomain.id})`;
    console.log(`✅ Admin authorized domain created: ${adminDomain.id}`);
  }

  // Check if admin user exists
  const existingAdmin = await userRepository.findOne({
    where: { email: ADMIN_DATA.user.email },
  });

  let userStatus: string;
  if (existingAdmin) {
    userStatus = 'Already exists (skipped)';
    console.log('⚠️ Admin user already exists. Skipping creation.');
  } else {
    const hashedPassword = await bcrypt.hash(
      ADMIN_DATA.user.password,
      BCRYPT_ROUNDS,
    );
    const adminUser = await userRepository.save(
      userRepository.create({
        ...ADMIN_DATA.user,
        password: hashedPassword,
        organizationId: adminOrg.id,
        authorizedDomainId: adminDomain.id,
      }),
    );
    userStatus = `Created (ID: ${adminUser.id})`;
    console.log(`✅ Admin user created: ${adminUser.id}`);

    // Update domain manager
    await authorizedDomainRepository.update(adminDomain.id, {
      domainManagerId: adminUser.id,
    });
    console.log('✅ Admin set as domain manager');
  }

  return { organizationStatus, userStatus, domainStatus };
}

async function createDemoUser(
  organizationRepository: ReturnType<DataSource['getRepository']>,
  userRepository: ReturnType<DataSource['getRepository']>,
  authorizedDomainRepository: ReturnType<DataSource['getRepository']>,
): Promise<SeedResult> {
  console.log('\nCreating demo user...');

  // Check if demo organization exists
  let demoOrg = await organizationRepository.findOne({
    where: { cnpj: DEMO_DATA.organization.cnpj },
  });

  let organizationStatus: string;
  if (demoOrg) {
    organizationStatus = 'Already exists (skipped)';
    console.log('⚠️ Demo organization already exists. Skipping creation.');
  } else {
    demoOrg = await organizationRepository.save(
      organizationRepository.create(DEMO_DATA.organization),
    );
    organizationStatus = `Created (ID: ${demoOrg.id})`;
    console.log(`✅ Demo organization created: ${demoOrg.id}`);
  }

  // Check if authorized domain exists
  let demoDomain = await authorizedDomainRepository.findOne({
    where: { domain: DEMO_DATA.authorizedDomain.domain },
  });

  let domainStatus: string;
  if (demoDomain) {
    domainStatus = 'Already exists (skipped)';
    console.log('⚠️ Demo authorized domain already exists. Skipping creation.');
  } else {
    demoDomain = await authorizedDomainRepository.save(
      authorizedDomainRepository.create({
        ...DEMO_DATA.authorizedDomain,
        organizationId: demoOrg.id,
      }),
    );
    domainStatus = `Created (ID: ${demoDomain.id})`;
    console.log(`✅ Demo authorized domain created: ${demoDomain.id}`);
  }

  // Check if demo user exists
  const existingDemo = await userRepository.findOne({
    where: { email: DEMO_DATA.user.email },
  });

  let userStatus: string;
  if (existingDemo) {
    userStatus = 'Already exists (skipped)';
    console.log('⚠️ Demo user already exists. Skipping creation.');
  } else {
    const hashedPassword = await bcrypt.hash(
      DEMO_DATA.user.password,
      BCRYPT_ROUNDS,
    );
    const demoUser = await userRepository.save(
      userRepository.create({
        ...DEMO_DATA.user,
        password: hashedPassword,
        organizationId: demoOrg.id,
        authorizedDomainId: demoDomain.id,
      }),
    );
    userStatus = `Created (ID: ${demoUser.id})`;
    console.log(`✅ Demo user created: ${demoUser.id}`);
  }

  return { organizationStatus, userStatus, domainStatus };
}

// Run seed
seedAdmin()
  .then(() => {
    console.log('\nAll done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
