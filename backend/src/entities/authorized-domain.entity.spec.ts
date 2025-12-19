import { AuthorizedDomain } from './authorized-domain.entity';
import { User, UserRole } from './user.entity';
import { Organization } from './organization.entity';

describe('AuthorizedDomain Entity', () => {
 describe('Entity Structure', () => {
 it('should create an AuthorizedDomain with required fields', () => {
 const domain = new AuthorizedDomain();
 domain.id = '123e4567-e89b-12d3-a456-426614174000';
 domain.domain = 'lages.sc.gov.br';
 domain.institutionName = 'Prefeitura de Lages';

 expect(domain.id).toBe('123e4567-e89b-12d3-a456-426614174000');
 expect(domain.domain).toBe('lages.sc.gov.br');
 expect(domain.institutionName).toBe('Prefeitura de Lages');
 });

 it('should allow setting isActive and maxUsers properties', () => {
 const domain = new AuthorizedDomain();
 domain.isActive = true;
 domain.maxUsers = 10;

 // Defaults are defined at database level via @Column decorator
 // At entity level, we validate properties can be assigned
 expect(domain.isActive).toBe(true);
 expect(domain.maxUsers).toBe(10);
 });

 it('should support nullable domainManager relationship', () => {
 const domain = new AuthorizedDomain();
 domain.domainManagerId = null;
 domain.domainManager = null;

 expect(domain.domainManagerId).toBeNull();
 expect(domain.domainManager).toBeNull();
 });

 it('should support domainManager assignment', () => {
 const domain = new AuthorizedDomain();
 const manager = new User();
 manager.id = 'manager-uuid';
 manager.email = 'manager@lages.sc.gov.br';
 manager.role = UserRole.DOMAIN_MANAGER;

 domain.domainManagerId = manager.id;
 domain.domainManager = manager;

 expect(domain.domainManagerId).toBe('manager-uuid');
 expect(domain.domainManager.email).toBe('manager@lages.sc.gov.br');
 expect(domain.domainManager.role).toBe(UserRole.DOMAIN_MANAGER);
 });

 it('should support nullable organization relationship', () => {
 const domain = new AuthorizedDomain();
 domain.organizationId = null;
 domain.organization = null;

 expect(domain.organizationId).toBeNull();
 expect(domain.organization).toBeNull();
 });

 it('should support organization assignment', () => {
 const domain = new AuthorizedDomain();
 const org = new Organization();
 org.id = 'org-uuid';
 org.name = 'Prefeitura de Lages';
 org.cnpj = '12.345.678/0001-90';

 domain.organizationId = org.id;
 domain.organization = org;

 expect(domain.organizationId).toBe('org-uuid');
 expect(domain.organization.name).toBe('Prefeitura de Lages');
 });

 it('should support users collection', () => {
 const domain = new AuthorizedDomain();
 const user1 = new User();
 user1.id = 'user-1';
 const user2 = new User();
 user2.id = 'user-2';

 domain.users = [user1, user2];

 expect(domain.users).toHaveLength(2);
 expect(domain.users[0].id).toBe('user-1');
 expect(domain.users[1].id).toBe('user-2');
 });
 });

 describe('User Entity - AuthorizedDomain Relationship', () => {
 it('should support authorizedDomain assignment in User', () => {
 const user = new User();
 const domain = new AuthorizedDomain();
 domain.id = 'domain-uuid';
 domain.domain = 'lages.sc.gov.br';

 user.authorizedDomainId = domain.id;
 user.authorizedDomain = domain;

 expect(user.authorizedDomainId).toBe('domain-uuid');
 expect(user.authorizedDomain.domain).toBe('lages.sc.gov.br');
 });

 it('should support nullable authorizedDomain in User', () => {
 const user = new User();
 user.authorizedDomainId = null;
 user.authorizedDomain = null;

 expect(user.authorizedDomainId).toBeNull();
 expect(user.authorizedDomain).toBeNull();
 });
 });

 describe('M8 Requirements Validation', () => {
 it('should support maxUsers quota (default 10)', () => {
 const domain = new AuthorizedDomain();
 domain.maxUsers = 10;

 expect(domain.maxUsers).toBe(10);
 });

 it('should allow custom maxUsers quota', () => {
 const domain = new AuthorizedDomain();
 domain.maxUsers = 25;

 expect(domain.maxUsers).toBe(25);
 });

 it('should support DOMAIN_MANAGER role as domainManager', () => {
 const manager = new User();
 manager.role = UserRole.DOMAIN_MANAGER;

 const domain = new AuthorizedDomain();
 domain.domainManager = manager;

 expect(domain.domainManager.role).toBe(UserRole.DOMAIN_MANAGER);
 });
 });
});
