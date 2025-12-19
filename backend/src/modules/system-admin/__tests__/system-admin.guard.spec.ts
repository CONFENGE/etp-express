import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SystemAdminGuard } from '../guards/system-admin.guard';
import { UserRole } from '../../../entities/user.entity';

describe('SystemAdminGuard', () => {
 let guard: SystemAdminGuard;

 beforeEach(() => {
 guard = new SystemAdminGuard();
 });

 const createMockExecutionContext = (user: unknown): ExecutionContext => {
 return {
 switchToHttp: () => ({
 getRequest: () => ({ user }),
 }),
 } as ExecutionContext;
 };

 it('should be defined', () => {
 expect(guard).toBeDefined();
 });

 describe('canActivate', () => {
 it('should return true for SYSTEM_ADMIN role', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'admin@confenge.com.br',
 role: UserRole.SYSTEM_ADMIN,
 });

 expect(guard.canActivate(context)).toBe(true);
 });

 it('should throw ForbiddenException for USER role', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'user@lages.sc.gov.br',
 role: UserRole.USER,
 });

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Only System Administrators can access this resource',
 );
 });

 it('should throw ForbiddenException for DOMAIN_MANAGER role', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'manager@lages.sc.gov.br',
 role: UserRole.DOMAIN_MANAGER,
 });

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Only System Administrators can access this resource',
 );
 });

 it('should throw ForbiddenException for DEMO role', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'demo@confenge.com.br',
 role: UserRole.DEMO,
 });

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Only System Administrators can access this resource',
 );
 });

 it('should throw ForbiddenException for ADMIN role (not SYSTEM_ADMIN)', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'admin@lages.sc.gov.br',
 role: UserRole.ADMIN,
 });

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Only System Administrators can access this resource',
 );
 });

 it('should throw ForbiddenException if no user in request', () => {
 const context = createMockExecutionContext(undefined);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Authentication required',
 );
 });

 it('should throw ForbiddenException if user is null', () => {
 const context = createMockExecutionContext(null);

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 expect(() => guard.canActivate(context)).toThrow(
 'Access denied: Authentication required',
 );
 });

 it('should throw ForbiddenException if user has no role', () => {
 const context = createMockExecutionContext({
 id: 'user-id',
 email: 'user@lages.sc.gov.br',
 });

 expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
 });
 });
});
