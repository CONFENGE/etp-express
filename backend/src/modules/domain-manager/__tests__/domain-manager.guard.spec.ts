import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DomainManagerGuard } from '../guards/domain-manager.guard';
import { UserRole } from '../../../entities/user.entity';

describe('DomainManagerGuard', () => {
 let guard: DomainManagerGuard;

 const createMockExecutionContext = (user: unknown): ExecutionContext => {
 return {
 switchToHttp: () => ({
 getRequest: () => ({
 user,
 }),
 }),
 } as ExecutionContext;
 };

 beforeEach(() => {
 guard = new DomainManagerGuard();
 });

 it('should be defined', () => {
 expect(guard).toBeDefined();
 });

 describe('canActivate', () => {
 it('should allow access for DOMAIN_MANAGER with assigned domain', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.DOMAIN_MANAGER,
 authorizedDomainId: 'domain-uuid-001',
 };

 const context = createMockExecutionContext(user);
 const result = guard.canActivate(context);

 expect(result).toBe(true);
 });

 it('should throw ForbiddenException if no user', () => {
 const context = createMockExecutionContext(null);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Authentication required',
 );
 });

 it('should throw ForbiddenException for USER role', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.USER,
 authorizedDomainId: 'domain-uuid-001',
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Only Domain Managers can access this resource',
 );
 });

 it('should throw ForbiddenException for ADMIN role', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.ADMIN,
 authorizedDomainId: 'domain-uuid-001',
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 });

 it('should throw ForbiddenException for SYSTEM_ADMIN role', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.SYSTEM_ADMIN,
 authorizedDomainId: 'domain-uuid-001',
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 });

 it('should throw ForbiddenException for DEMO role', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.DEMO,
 authorizedDomainId: 'domain-uuid-001',
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 });

 it('should throw ForbiddenException if DOMAIN_MANAGER has no assigned domain', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.DOMAIN_MANAGER,
 authorizedDomainId: null,
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'No authorized domain assigned to this manager',
 );
 });

 it('should throw ForbiddenException if authorizedDomainId is undefined', () => {
 const user = {
 id: 'user-uuid-001',
 role: UserRole.DOMAIN_MANAGER,
 };

 const context = createMockExecutionContext(user);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 });
 });
});
