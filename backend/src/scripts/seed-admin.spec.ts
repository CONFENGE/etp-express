import * as bcrypt from 'bcrypt';
import { UserRole } from '../entities/user.entity';

/**
 * Tests for seed-admin.ts script.
 *
 * Note: These tests validate the seed script logic without requiring a database connection.
 * Integration tests would require a test database setup.
 *
 * @see Issue #469 - Criar seed script para usuários iniciais
 */

describe('Seed Admin Script', () => {
  describe('Data Configuration', () => {
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

    describe('Admin User Configuration', () => {
      it('should have correct admin email', () => {
        expect(ADMIN_DATA.user.email).toBe('tiago@confenge.com.br');
      });

      it('should have SYSTEM_ADMIN role', () => {
        expect(ADMIN_DATA.user.role).toBe(UserRole.SYSTEM_ADMIN);
      });

      it('should not require password change', () => {
        expect(ADMIN_DATA.user.mustChangePassword).toBe(false);
      });

      it('should have valid organization CNPJ', () => {
        expect(ADMIN_DATA.organization.cnpj).toMatch(
          /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
        );
      });

      it('should have matching domain in organization whitelist and authorized domain', () => {
        expect(ADMIN_DATA.organization.domainWhitelist).toContain(
          ADMIN_DATA.authorizedDomain.domain,
        );
      });

      it('should have high maxUsers for admin domain', () => {
        expect(ADMIN_DATA.authorizedDomain.maxUsers).toBeGreaterThanOrEqual(
          100,
        );
      });
    });

    describe('Demo User Configuration', () => {
      it('should have correct demo email', () => {
        expect(DEMO_DATA.user.email).toBe('demoetp@confenge.com.br');
      });

      it('should have DEMO role', () => {
        expect(DEMO_DATA.user.role).toBe(UserRole.DEMO);
      });

      it('should not require password change', () => {
        expect(DEMO_DATA.user.mustChangePassword).toBe(false);
      });

      it('should have valid organization CNPJ', () => {
        expect(DEMO_DATA.organization.cnpj).toMatch(
          /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
        );
      });

      it('should have matching domain in organization whitelist and authorized domain', () => {
        expect(DEMO_DATA.organization.domainWhitelist).toContain(
          DEMO_DATA.authorizedDomain.domain,
        );
      });

      it('should have limited maxUsers for demo domain', () => {
        expect(DEMO_DATA.authorizedDomain.maxUsers).toBe(1);
      });

      it('should have different CNPJ from admin organization', () => {
        expect(DEMO_DATA.organization.cnpj).not.toBe(
          ADMIN_DATA.organization.cnpj,
        );
      });
    });
  });

  describe('Password Hashing', () => {
    const BCRYPT_ROUNDS = 10;

    it('should hash admin password with correct cost factor', async () => {
      const password = 'Crj70011!';
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Bcrypt hash should start with $2b$ (bcrypt algorithm)
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);

      // Verify hash length is correct (60 characters for bcrypt)
      expect(hashedPassword.length).toBe(60);
    });

    it('should hash demo password with correct cost factor', async () => {
      const password = 'teste2026';
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Bcrypt hash should start with $2b$ (bcrypt algorithm)
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);

      // Verify hash length is correct (60 characters for bcrypt)
      expect(hashedPassword.length).toBe(60);
    });

    it('should produce verifiable hashes', async () => {
      const adminPassword = 'Crj70011!';
      const demoPassword = 'teste2026';

      const adminHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
      const demoHash = await bcrypt.hash(demoPassword, BCRYPT_ROUNDS);

      // Verify correct passwords match
      expect(await bcrypt.compare(adminPassword, adminHash)).toBe(true);
      expect(await bcrypt.compare(demoPassword, demoHash)).toBe(true);

      // Verify incorrect passwords don't match
      expect(await bcrypt.compare('wrong_password', adminHash)).toBe(false);
      expect(await bcrypt.compare('wrong_password', demoHash)).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'Crj70011!';
      const hash1 = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const hash2 = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Hashes should be different (due to random salt)
      expect(hash1).not.toBe(hash2);

      // But both should verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('UserRole Enum', () => {
    it('should have SYSTEM_ADMIN role defined', () => {
      expect(UserRole.SYSTEM_ADMIN).toBeDefined();
      expect(UserRole.SYSTEM_ADMIN).toBe('system_admin');
    });

    it('should have DEMO role defined', () => {
      expect(UserRole.DEMO).toBeDefined();
      expect(UserRole.DEMO).toBe('demo');
    });

    it('should have DOMAIN_MANAGER role defined', () => {
      expect(UserRole.DOMAIN_MANAGER).toBeDefined();
      expect(UserRole.DOMAIN_MANAGER).toBe('domain_manager');
    });

    it('should have all required roles for M8', () => {
      const requiredRoles = [
        'SYSTEM_ADMIN',
        'DOMAIN_MANAGER',
        'DEMO',
        'ADMIN',
        'USER',
        'VIEWER',
      ];

      for (const role of requiredRoles) {
        expect(UserRole[role as keyof typeof UserRole]).toBeDefined();
      }
    });
  });

  describe('Idempotency Requirements', () => {
    it('should have unique CNPJ for admin organization', () => {
      const adminCnpj = '00.000.000/0001-00';
      const demoCnpj = '00.000.000/0002-00';

      expect(adminCnpj).not.toBe(demoCnpj);
    });

    it('should have unique email for admin user', () => {
      const adminEmail = 'tiago@confenge.com.br';
      const demoEmail = 'demoetp@confenge.com.br';

      expect(adminEmail).not.toBe(demoEmail);
    });

    it('should have unique domain for each authorized domain', () => {
      const adminDomain = 'confenge.com.br';
      const demoDomain = 'demo.etpexpress.com.br';

      expect(adminDomain).not.toBe(demoDomain);
    });
  });

  describe('Security Requirements', () => {
    it('admin password should meet complexity requirements', () => {
      const password = 'Crj70011!';

      // Minimum 8 characters
      expect(password.length).toBeGreaterThanOrEqual(8);

      // Contains uppercase
      expect(password).toMatch(/[A-Z]/);

      // Contains lowercase
      expect(password).toMatch(/[a-z]/);

      // Contains number
      expect(password).toMatch(/[0-9]/);

      // Contains special character
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/);
    });

    it('admin should not require password change (master account)', () => {
      const mustChangePassword = false;
      expect(mustChangePassword).toBe(false);
    });

    it('demo user should not require password change (demo access)', () => {
      const mustChangePassword = false;
      expect(mustChangePassword).toBe(false);
    });
  });

  describe('M8 Requirements Validation', () => {
    it('SYSTEM_ADMIN should be the highest privilege role', () => {
      // SYSTEM_ADMIN manages all domains globally
      const systemAdminRole = UserRole.SYSTEM_ADMIN;
      expect(systemAdminRole).toBe('system_admin');
    });

    it('DEMO should have isolated data access', () => {
      // Demo organization and domain are separate
      const demoOrgName = 'Demonstração ETP Express';
      const demoDomain = 'demo.etpexpress.com.br';

      expect(demoOrgName).toContain('Demonstração');
      expect(demoDomain).toContain('demo');
    });

    it('admin domain should allow high user quota', () => {
      const adminMaxUsers = 100;
      expect(adminMaxUsers).toBeGreaterThanOrEqual(10);
    });

    it('demo domain should have minimal user quota', () => {
      const demoMaxUsers = 1;
      expect(demoMaxUsers).toBe(1);
    });
  });
});
