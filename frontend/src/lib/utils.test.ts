import { describe, it, expect } from 'vitest';
import {
  normalizeDate,
  formatDate,
  formatDateTime,
  cn,
  truncate,
  isValidEmail,
  isStrongPassword,
  getErrorMessage,
  getInitials,
} from './utils';

describe('normalizeDate', () => {
  it('should return same Date object when given a Date', () => {
    const date = new Date('2026-01-17T12:00:00.000Z');
    const result = normalizeDate(date);
    expect(result).toBe(date);
  });

  it('should convert ISO string to Date object', () => {
    const isoString = '2026-01-17T12:00:00.000Z';
    const result = normalizeDate(isoString);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe(isoString);
  });

  it('should handle date-only strings', () => {
    const dateString = '2026-01-17';
    const result = normalizeDate(dateString);
    expect(result).toBeInstanceOf(Date);
    // Use UTC methods to avoid timezone issues in tests
    expect(result.getUTCFullYear()).toBe(2026);
    expect(result.getUTCMonth()).toBe(0); // January is 0
    expect(result.getUTCDate()).toBe(17);
  });
});

describe('formatDate', () => {
  it('should format Date object to Brazilian format', () => {
    const date = new Date('2026-01-17T12:00:00.000Z');
    const result = formatDate(date);
    expect(result).toBe('17/01/2026');
  });

  it('should format ISO string to Brazilian format', () => {
    const isoString = '2026-01-17T12:00:00.000Z';
    const result = formatDate(isoString);
    expect(result).toBe('17/01/2026');
  });
});

describe('formatDateTime', () => {
  it('should format Date object with time', () => {
    // Use a fixed timezone for consistent testing
    const date = new Date('2026-01-17T12:00:00.000Z');
    const result = formatDateTime(date);
    // Result format: dd/mm/yyyy, hh:mm (time depends on timezone)
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
  });

  it('should format ISO string with time', () => {
    const isoString = '2026-01-17T12:00:00.000Z';
    const result = formatDateTime(isoString);
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
  });
});

describe('cn', () => {
  it('should merge class names', () => {
    const result = cn('px-4', 'py-2', 'text-sm');
    expect(result).toBe('px-4 py-2 text-sm');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toBe('base active');
  });

  it('should merge conflicting tailwind classes', () => {
    const result = cn('px-4', 'px-8');
    expect(result).toBe('px-8');
  });
});

describe('truncate', () => {
  it('should truncate text longer than length', () => {
    const text = 'This is a very long text';
    const result = truncate(text, 10);
    expect(result).toBe('This is a ...');
  });

  it('should not truncate text shorter than length', () => {
    const text = 'Short';
    const result = truncate(text, 10);
    expect(result).toBe('Short');
  });

  it('should not truncate text equal to length', () => {
    const text = '1234567890';
    const result = truncate(text, 10);
    expect(result).toBe('1234567890');
  });
});

describe('isValidEmail', () => {
  it('should return true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.org')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('test@domain')).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('should return true for strong password', () => {
    expect(isStrongPassword('Abcdef1!')).toBe(true);
    expect(isStrongPassword('MyP@ssw0rd!')).toBe(true);
  });

  it('should return false for weak password', () => {
    expect(isStrongPassword('short')).toBe(false);
    expect(isStrongPassword('nouppercase1!')).toBe(false);
    expect(isStrongPassword('NOLOWERCASE1!')).toBe(false);
    expect(isStrongPassword('NoNumbers!')).toBe(false);
    expect(isStrongPassword('NoSpecial1')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('should return string directly', () => {
    expect(getErrorMessage('Error string')).toBe('Error string');
  });

  it('should extract message from object with message property', () => {
    expect(getErrorMessage({ message: 'Object error' })).toBe('Object error');
  });

  it('should return default message for unknown error', () => {
    expect(getErrorMessage(null)).toBe('Erro desconhecido');
    expect(getErrorMessage(undefined)).toBe('Erro desconhecido');
    expect(getErrorMessage(123)).toBe('Erro desconhecido');
  });
});

describe('getInitials', () => {
  it('should return first two initials', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Marie Smith')).toBe('JM');
  });

  it('should handle single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('should uppercase initials', () => {
    expect(getInitials('john doe')).toBe('JD');
  });
});
