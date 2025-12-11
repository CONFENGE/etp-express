import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const validData = {
    email: 'usuario@exemplo.gov.br',
    password: 'SenhaSegura123!',
    name: 'João da Silva',
    lgpdConsent: true,
    internationalTransferConsent: true,
  };

  describe('password complexity validation', () => {
    it('should accept valid password with all requirements', async () => {
      const dto = plainToInstance(RegisterDto, validData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'Abc1!',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.minLength).toContain('8 caracteres');
    });

    it('should reject password longer than 128 characters', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'Abc1!' + 'a'.repeat(125),
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.maxLength).toContain('128 caracteres');
    });

    it('should reject password without uppercase letter', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'senhasegura123!',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain('letra maiúscula');
    });

    it('should reject password without lowercase letter', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'SENHASEGURA123!',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain('letra minúscula');
    });

    it('should reject password without number', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'SenhaSegura!@#',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain('número');
    });

    it('should reject password without special character', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'SenhaSegura123',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints?.matches).toContain(
        'caractere especial',
      );
    });

    it('should reject simple passwords like "12345678"', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: '12345678',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should reject common passwords like "password"', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        password: 'password',
      });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should accept password with various special characters', async () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '.', '?'];
      for (const char of specialChars) {
        const dto = plainToInstance(RegisterDto, {
          ...validData,
          password: `SenhaSegura123${char}`,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('other field validations', () => {
    it('should reject invalid email', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        email: 'invalid-email',
      });
      const errors = await validate(dto);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should reject non-string name', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        name: 123,
      });
      const errors = await validate(dto);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });

    it('should require lgpdConsent', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        lgpdConsent: undefined,
      });
      const errors = await validate(dto);
      const lgpdError = errors.find((e) => e.property === 'lgpdConsent');
      expect(lgpdError).toBeDefined();
    });

    it('should require internationalTransferConsent', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        internationalTransferConsent: undefined,
      });
      const errors = await validate(dto);
      const consentError = errors.find(
        (e) => e.property === 'internationalTransferConsent',
      );
      expect(consentError).toBeDefined();
    });

    it('should allow optional cargo field', async () => {
      const dto = plainToInstance(RegisterDto, {
        ...validData,
        cargo: 'Analista',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
