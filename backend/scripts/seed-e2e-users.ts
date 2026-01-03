import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import { AuthorizedDomain } from '../src/entities/authorized-domain.entity';

config();

/**
 * Seed script for E2E test users.
 * Creates test users for automated E2E testing in Railway environment.
 *
 * Users Created:
 * - admin@confenge.com.br (SYSTEM_ADMIN) - For admin E2E tests
 * - manager@confenge.com.br (DOMAIN_MANAGER) - For manager E2E tests
 * - user@confenge.com.br (DOMAIN_USER) - For regular user E2E tests
 *
 * Usage:
 * - Development: npm run seed:e2e
 * - Production: npm run seed:e2e:prod
 *
 * @see Issue #1147 - Fix Auth Role-Access E2E tests
 * @see Epic #1137 - Fix all E2E tests for Railway CI
 */

const BCRYPT_ROUNDS = 10;

const E2E_USERS = [
  {
    email: 'admin@confenge.com.br',
    password: 'Admin@123',
    name: 'E2E Admin User',
    role: UserRole.SYSTEM_ADMIN,
    mustChangePassword: false,
  },
  {
    email: 'manager@confenge.com.br',
    password: 'Manager@123',
    name: 'E2E Manager User',
    role: UserRole.DOMAIN_MANAGER,
    mustChangePassword: false,
  },
  {
    email: 'user@confenge.com.br',
    password: 'User@123',
    name: 'E2E Regular User',
    role: UserRole.DOMAIN_USER,
    mustChangePassword: false,
  },
];

async function seedE2EUsers(): Promise<void> {
  console.log('Starting E2E users seed script...');

  // Determine SSL configuration based on environment
  const useSSL =
    process.env.PGSSLMODE !== 'disable' &&
    process.env.NODE_ENV === 'production';

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Organization, AuthorizedDomain],
    synchronize: false,
    logging: false,
    ssl: useSSL,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const organizationRepository = dataSource.getRepository(Organization);
    const userRepository = dataSource.getRepository(User);
    const authorizedDomainRepository =
      dataSource.getRepository(AuthorizedDomain);

    // Find the CONFENGE organization and domain
    const confengeOrg = await organizationRepository.findOne({
      where: { cnpj: '00.000.000/0001-00' },
    });

    if (!confengeOrg) {
      throw new Error('CONFENGE organization not found. Run seed:admin first.');
    }

    const confengeDomain = await authorizedDomainRepository.findOne({
      where: { domain: 'confenge.com.br' },
    });

    if (!confengeDomain) {
      throw new Error(
        'confenge.com.br domain not found. Run seed:admin first.',
      );
    }

    console.log(`Using organization: ${confengeOrg.name} (${confengeOrg.id})`);
    console.log(
      `Using domain: ${confengeDomain.domain} (${confengeDomain.id})`,
    );

    // Create E2E test users
    for (const userData of E2E_USERS) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists. Skipping.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(
        userData.password,
        BCRYPT_ROUNDS,
      );
      const newUser = await userRepository.save(
        userRepository.create({
          ...userData,
          password: hashedPassword,
          organizationId: confengeOrg.id,
          authorizedDomainId: confengeDomain.id,
        }),
      );

      console.log(
        `Created ${userData.role} user: ${userData.email} (ID: ${newUser.id})`,
      );
    }

    console.log('\nE2E users seed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run seed
seedE2EUsers()
  .then(() => {
    console.log('\nAll done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
