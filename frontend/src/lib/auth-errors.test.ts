import { describe, it, expect } from 'vitest';
import {
 AUTH_ERROR_CODES,
 AUTH_ERROR_MESSAGES,
 getAuthErrorMessage,
 type AuthErrorCode,
} from './constants';

describe('Auth Error Handling', () => {
 describe('AUTH_ERROR_CODES', () => {
 it('should have all expected error codes', () => {
 expect(AUTH_ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
 expect(AUTH_ERROR_CODES.USER_INACTIVE).toBe('USER_INACTIVE');
 expect(AUTH_ERROR_CODES.NO_ORGANIZATION).toBe('NO_ORGANIZATION');
 expect(AUTH_ERROR_CODES.ORG_INACTIVE).toBe('ORG_INACTIVE');
 expect(AUTH_ERROR_CODES.ORG_NOT_FOUND).toBe('ORG_NOT_FOUND');
 expect(AUTH_ERROR_CODES.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED');
 });
 });

 describe('AUTH_ERROR_MESSAGES', () => {
 it('should have messages for all error codes', () => {
 const codes: AuthErrorCode[] = [
 'INVALID_CREDENTIALS',
 'USER_INACTIVE',
 'NO_ORGANIZATION',
 'ORG_INACTIVE',
 'ORG_NOT_FOUND',
 'ACCOUNT_LOCKED',
 ];

 codes.forEach((code) => {
 expect(AUTH_ERROR_MESSAGES[code]).toBeDefined();
 expect(typeof AUTH_ERROR_MESSAGES[code]).toBe('string');
 expect(AUTH_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
 });
 });

 it('should have Portuguese messages', () => {
 expect(
 AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
 ).toContain('Email ou senha incorretos');
 expect(AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.USER_INACTIVE]).toContain(
 'desativada',
 );
 expect(AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.NO_ORGANIZATION]).toContain(
 'organização',
 );
 expect(AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ORG_INACTIVE]).toContain(
 'suspensa',
 );
 expect(AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ORG_NOT_FOUND]).toContain(
 'não encontrada',
 );
 expect(AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_LOCKED]).toContain(
 'bloqueada',
 );
 });
 });

 describe('getAuthErrorMessage', () => {
 describe('with structured error response (NestJS format)', () => {
 it('should extract message from nested message.code structure', () => {
 const error = {
 message: {
 code: 'INVALID_CREDENTIALS',
 message: 'Backend message',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
 });

 it('should handle USER_INACTIVE error code', () => {
 const error = {
 message: {
 code: 'USER_INACTIVE',
 message: 'Sua conta está desativada.',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.USER_INACTIVE);
 });

 it('should handle NO_ORGANIZATION error code', () => {
 const error = {
 message: {
 code: 'NO_ORGANIZATION',
 message: 'Usuário sem organização.',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.NO_ORGANIZATION);
 });

 it('should handle ORG_INACTIVE error code', () => {
 const error = {
 message: {
 code: 'ORG_INACTIVE',
 message: 'Organização suspensa.',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.ORG_INACTIVE);
 });

 it('should handle ORG_NOT_FOUND error code', () => {
 const error = {
 message: {
 code: 'ORG_NOT_FOUND',
 message: 'Organização não encontrada.',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.ORG_NOT_FOUND);
 });

 it('should use nested message.message when code is unknown', () => {
 const error = {
 message: {
 code: 'UNKNOWN_CODE',
 message: 'Custom backend message',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe('Custom backend message');
 });
 });

 describe('with direct error code', () => {
 it('should extract message from direct code property', () => {
 const error = {
 code: 'INVALID_CREDENTIALS',
 message: 'Some message',
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
 });

 it('should handle all error codes directly', () => {
 const codes: AuthErrorCode[] = [
 'INVALID_CREDENTIALS',
 'USER_INACTIVE',
 'NO_ORGANIZATION',
 'ORG_INACTIVE',
 'ORG_NOT_FOUND',
 'ACCOUNT_LOCKED',
 ];

 codes.forEach((code) => {
 const error = { code, message: 'Test' };
 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES[code]);
 });
 });
 });

 describe('with simple message string', () => {
 it('should return the message string directly', () => {
 const error = { message: 'Custom error message' };

 const result = getAuthErrorMessage(error);
 expect(result).toBe('Custom error message');
 });

 it('should detect ThrottlerException and return rate limit message', () => {
 const error = { message: 'ThrottlerException: Too many requests' };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED);
 });
 });

 describe('with Error instance', () => {
 it('should extract message from Error instance', () => {
 const error = new Error('Error instance message');

 const result = getAuthErrorMessage(error);
 expect(result).toBe('Error instance message');
 });
 });

 describe('edge cases', () => {
 it('should return default message when error is null', () => {
 const result = getAuthErrorMessage(null);
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });

 it('should return default message when error is undefined', () => {
 const result = getAuthErrorMessage(undefined);
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });

 it('should return default message when error is empty object', () => {
 const result = getAuthErrorMessage({});
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });

 it('should return default message for non-object error', () => {
 const result = getAuthErrorMessage(42);
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });

 it('should return default message for string error', () => {
 const result = getAuthErrorMessage('string error');
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });

 it('should handle error with only nested message object but no code', () => {
 const error = {
 message: {
 somethingElse: 'value',
 },
 };

 const result = getAuthErrorMessage(error);
 expect(result).toBe(
 'Erro ao fazer login. Verifique suas credenciais e tente novamente.',
 );
 });
 });
 });
});
