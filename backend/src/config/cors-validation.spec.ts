import * as Joi from 'joi';

/**
 * Test suite for CORS configuration validation (#599)
 *
 * Validates that CORS_ORIGINS is required in production but optional in development.
 * This prevents silent fallback to localhost in production environments.
 */
describe('CORS Configuration Validation (#599)', () => {
  // Schema that mirrors the app.module.ts validation
  const corsSchema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    CORS_ORIGINS: Joi.when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required().messages({
        'any.required':
          'CORS_ORIGINS must be defined in production. Example: CORS_ORIGINS=https://your-frontend.railway.app',
      }),
      otherwise: Joi.string().default('http://localhost:5173'),
    }),
  });

  describe('Production environment', () => {
    it('should fail validation when CORS_ORIGINS is not defined in production', () => {
      const config = {
        NODE_ENV: 'production',
        // CORS_ORIGINS not defined
      };

      const result = corsSchema.validate(config, { abortEarly: false });

      expect(result.error).toBeDefined();
      expect(result.error!.details[0].message).toContain(
        'CORS_ORIGINS must be defined in production',
      );
    });

    it('should fail validation when CORS_ORIGINS is empty string in production', () => {
      const config = {
        NODE_ENV: 'production',
        CORS_ORIGINS: '',
      };

      const result = corsSchema.validate(config, { abortEarly: false });

      expect(result.error).toBeDefined();
      expect(result.error!.details[0].type).toBe('string.empty');
    });

    it('should pass validation when CORS_ORIGINS is defined in production', () => {
      const config = {
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://etp-express-frontend.railway.app',
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toBe(
        'https://etp-express-frontend.railway.app',
      );
    });

    it('should accept multiple CORS origins in production (comma-separated)', () => {
      const config = {
        NODE_ENV: 'production',
        CORS_ORIGINS:
          'https://etp-express-frontend.railway.app,https://admin.example.com',
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toContain(
        'https://etp-express-frontend.railway.app',
      );
    });
  });

  describe('Development environment', () => {
    it('should use default localhost:5173 when CORS_ORIGINS is not defined', () => {
      const config = {
        NODE_ENV: 'development',
        // CORS_ORIGINS not defined
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toBe('http://localhost:5173');
    });

    it('should allow custom CORS origins in development', () => {
      const config = {
        NODE_ENV: 'development',
        CORS_ORIGINS: 'http://localhost:3000',
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toBe('http://localhost:3000');
    });

    it('should use default localhost when NODE_ENV defaults to development', () => {
      const config = {
        // NODE_ENV not defined - defaults to 'development'
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.NODE_ENV).toBe('development');
      expect(result.value.CORS_ORIGINS).toBe('http://localhost:5173');
    });
  });

  describe('Test environment', () => {
    it('should use default localhost:5173 in test environment', () => {
      const config = {
        NODE_ENV: 'test',
        // CORS_ORIGINS not defined
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toBe('http://localhost:5173');
    });

    it('should allow custom CORS origins in test environment', () => {
      const config = {
        NODE_ENV: 'test',
        CORS_ORIGINS: 'http://localhost:4000',
      };

      const result = corsSchema.validate(config);

      expect(result.error).toBeUndefined();
      expect(result.value.CORS_ORIGINS).toBe('http://localhost:4000');
    });
  });

  describe('Error message clarity', () => {
    it('should provide clear error message for missing CORS_ORIGINS in production', () => {
      const config = {
        NODE_ENV: 'production',
      };

      const result = corsSchema.validate(config, { abortEarly: false });

      expect(result.error).toBeDefined();
      const errorMessage = result.error!.details[0].message;
      expect(errorMessage).toContain('CORS_ORIGINS');
      expect(errorMessage).toContain('production');
    });
  });
});
