import { User, UserRole } from './user.entity';
import { Organization } from './organization.entity';
import { AuthorizedDomain } from './authorized-domain.entity';

describe('User Entity', () => {
  describe('Entity Structure', () => {
    it('should create a User with required fields', () => {
      const user = new User();
      user.id = '123e4567-e89b-12d3-a456-426614174000';
      user.email = 'test@example.com';
      user.password = 'hashedPassword';
      user.name = 'Test User';
      user.organizationId = 'org-uuid';

      expect(user.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('hashedPassword');
      expect(user.name).toBe('Test User');
      expect(user.organizationId).toBe('org-uuid');
    });

    it('should support all UserRole values', () => {
      const user = new User();

      user.role = UserRole.SYSTEM_ADMIN;
      expect(user.role).toBe('system_admin');

      user.role = UserRole.DOMAIN_MANAGER;
      expect(user.role).toBe('domain_manager');

      user.role = UserRole.ADMIN;
      expect(user.role).toBe('admin');

      user.role = UserRole.USER;
      expect(user.role).toBe('user');

      user.role = UserRole.VIEWER;
      expect(user.role).toBe('viewer');

      user.role = UserRole.DEMO;
      expect(user.role).toBe('demo');
    });
  });

  describe('Organization Relationship', () => {
    it('should support organization assignment', () => {
      const user = new User();
      const org = new Organization();
      org.id = 'org-uuid';
      org.name = 'Test Organization';

      user.organizationId = org.id;
      user.organization = org;

      expect(user.organizationId).toBe('org-uuid');
      expect(user.organization?.name).toBe('Test Organization');
    });
  });

  describe('AuthorizedDomain Relationship', () => {
    it('should support authorizedDomain assignment', () => {
      const user = new User();
      const domain = new AuthorizedDomain();
      domain.id = 'domain-uuid';
      domain.domain = 'gov.br';

      user.authorizedDomainId = domain.id;
      user.authorizedDomain = domain;

      expect(user.authorizedDomainId).toBe('domain-uuid');
      expect(user.authorizedDomain?.domain).toBe('gov.br');
    });

    it('should support nullable authorizedDomain', () => {
      const user = new User();
      user.authorizedDomainId = null;
      user.authorizedDomain = null;

      expect(user.authorizedDomainId).toBeNull();
      expect(user.authorizedDomain).toBeNull();
    });
  });

  describe('LGPD Consent Fields', () => {
    it('should support LGPD consent tracking', () => {
      const user = new User();
      const consentDate = new Date();

      user.lgpdConsentAt = consentDate;
      user.lgpdConsentVersion = '1.0';
      user.internationalTransferConsentAt = consentDate;

      expect(user.lgpdConsentAt).toBe(consentDate);
      expect(user.lgpdConsentVersion).toBe('1.0');
      expect(user.internationalTransferConsentAt).toBe(consentDate);
    });

    it('should support nullable LGPD consent fields', () => {
      const user = new User();
      user.lgpdConsentAt = null;
      user.lgpdConsentVersion = null;
      user.internationalTransferConsentAt = null;

      expect(user.lgpdConsentAt).toBeNull();
      expect(user.lgpdConsentVersion).toBeNull();
      expect(user.internationalTransferConsentAt).toBeNull();
    });
  });

  describe('Demo User ETP Limit (#1439)', () => {
    it('should support etpLimitCount field', () => {
      const user = new User();
      user.etpLimitCount = 3;

      expect(user.etpLimitCount).toBe(3);
    });

    it('should support nullable etpLimitCount for non-demo users', () => {
      const user = new User();
      user.role = UserRole.USER;
      user.etpLimitCount = null;

      expect(user.etpLimitCount).toBeNull();
    });

    it('should allow custom etpLimitCount values', () => {
      const user = new User();
      user.role = UserRole.DEMO;
      user.etpLimitCount = 5;

      expect(user.etpLimitCount).toBe(5);
    });

    it('should support zero etpLimitCount (blocked demo user)', () => {
      const user = new User();
      user.role = UserRole.DEMO;
      user.etpLimitCount = 0;

      expect(user.etpLimitCount).toBe(0);
    });

    it('should work with DEMO role users', () => {
      const user = new User();
      user.id = 'demo-user-uuid';
      user.email = 'demo@example.com';
      user.name = 'Demo User';
      user.role = UserRole.DEMO;
      user.etpLimitCount = 3;
      user.organizationId = 'demo-org-uuid';

      expect(user.role).toBe(UserRole.DEMO);
      expect(user.etpLimitCount).toBe(3);
    });
  });

  describe('Account Status Fields', () => {
    it('should support mustChangePassword flag', () => {
      const user = new User();
      user.mustChangePassword = true;

      expect(user.mustChangePassword).toBe(true);
    });

    it('should support isActive flag', () => {
      const user = new User();
      user.isActive = false;

      expect(user.isActive).toBe(false);
    });

    it('should support soft delete via deletedAt', () => {
      const user = new User();
      const deletedDate = new Date();
      user.deletedAt = deletedDate;

      expect(user.deletedAt).toBe(deletedDate);
    });
  });
});
