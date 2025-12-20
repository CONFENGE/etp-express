import { Injectable, Logger } from '@nestjs/common';
import {
  SectionSchema,
  AI_LEAKAGE_PATTERNS,
  getSchemaForSection,
} from '../schemas/section-schemas';

/**
 * Result of LLM output validation.
 */
export interface ValidationResult {
  /** Whether the output passed all validation checks */
  valid: boolean;
  /** Reason for validation failure (if invalid) */
  reason?: string;
  /** Specific patterns that were detected (security) */
  detectedPatterns?: string[];
  /** Validation details for logging/debugging */
  details?: {
    outputLength: number;
    maxLength: number;
    minLength: number;
    sectionType: string;
  };
}

/**
 * Error thrown when LLM output validation fails after max retries.
 */
export class LLMOutputValidationError extends Error {
  constructor(
    message: string,
    public readonly sectionType: string,
    public readonly attempts: number,
    public readonly lastReason: string,
  ) {
    super(message);
    this.name = 'LLMOutputValidationError';
  }
}

/**
 * Service for validating LLM output to prevent hallucination and injection attacks.
 *
 * @remarks
 * Implements OWASP LLM Top 10 recommendations for Insecure Output Handling:
 * - Validates output length within acceptable bounds
 * - Detects and blocks forbidden patterns (XSS, injection)
 * - Identifies AI system prompt leakage
 * - Validates JSON structure when expected
 * - Detects empty or repetitive content
 *
 * @see Issue #656 - Validação estruturada de saída do LLM
 * @see OWASP LLM Top 10 - LLM02: Insecure Output Handling
 */
@Injectable()
export class OutputValidatorService {
  private readonly logger = new Logger(OutputValidatorService.name);

  /**
   * Validates LLM output against the schema for the given section type.
   *
   * @param output - The raw output from the LLM
   * @param sectionType - Type of section being validated
   * @returns Validation result indicating if output is safe and well-formed
   *
   * @example
   * ```ts
   * const result = validator.validateOutput(llmResponse, 'justificativa');
   * if (!result.valid) {
   *   logger.warn('Invalid output', { reason: result.reason });
   * }
   * ```
   */
  validateOutput(output: string, sectionType: string): ValidationResult {
    const schema = getSchemaForSection(sectionType);

    // 1. Check for empty or whitespace-only output
    if (!output || output.trim().length === 0) {
      return {
        valid: false,
        reason: 'Output is empty or whitespace-only',
        details: {
          outputLength: 0,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    const trimmedOutput = output.trim();

    // 2. Check minimum length
    if (trimmedOutput.length < schema.minLength) {
      return {
        valid: false,
        reason: `Output too short: ${trimmedOutput.length} < ${schema.minLength} characters`,
        details: {
          outputLength: trimmedOutput.length,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    // 3. Check maximum length
    if (trimmedOutput.length > schema.maxLength) {
      return {
        valid: false,
        reason: `Output too long: ${trimmedOutput.length} > ${schema.maxLength} characters`,
        details: {
          outputLength: trimmedOutput.length,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    // 4. Check for forbidden patterns (security)
    const detectedForbidden = this.detectForbiddenPatterns(
      trimmedOutput,
      schema.forbiddenPatterns,
    );
    if (detectedForbidden.length > 0) {
      this.logger.warn('Forbidden patterns detected in LLM output', {
        sectionType,
        patterns: detectedForbidden,
        outputPreview: trimmedOutput.substring(0, 200),
      });

      return {
        valid: false,
        reason: 'Forbidden patterns detected in output',
        detectedPatterns: detectedForbidden,
        details: {
          outputLength: trimmedOutput.length,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    // 5. Check for AI system prompt leakage
    const detectedLeakage = this.detectAILeakage(trimmedOutput);
    if (detectedLeakage.length > 0) {
      this.logger.warn('AI system prompt leakage detected', {
        sectionType,
        patterns: detectedLeakage,
      });

      return {
        valid: false,
        reason: 'AI system prompt leakage detected',
        detectedPatterns: detectedLeakage,
        details: {
          outputLength: trimmedOutput.length,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    // 6. Check for repetitive content
    if (this.isRepetitiveContent(trimmedOutput)) {
      return {
        valid: false,
        reason: 'Output contains excessive repetitive content',
        details: {
          outputLength: trimmedOutput.length,
          maxLength: schema.maxLength,
          minLength: schema.minLength,
          sectionType,
        },
      };
    }

    // 7. Validate JSON structure if expected
    if (schema.expectJson) {
      const jsonValidation = this.validateJsonStructure(
        trimmedOutput,
        schema.requiredFields,
      );
      if (!jsonValidation.valid) {
        return {
          valid: false,
          reason: jsonValidation.reason,
          details: {
            outputLength: trimmedOutput.length,
            maxLength: schema.maxLength,
            minLength: schema.minLength,
            sectionType,
          },
        };
      }
    }

    // All checks passed
    return {
      valid: true,
      details: {
        outputLength: trimmedOutput.length,
        maxLength: schema.maxLength,
        minLength: schema.minLength,
        sectionType,
      },
    };
  }

  /**
   * Detects forbidden patterns in output.
   *
   * @param output - Output to check
   * @param patterns - Patterns to detect
   * @returns Array of detected patterns
   * @private
   */
  private detectForbiddenPatterns(
    output: string,
    patterns: string[],
  ): string[] {
    const detected: string[] = [];
    const lowerOutput = output.toLowerCase();

    for (const pattern of patterns) {
      // Check if pattern is a regex pattern (has backslashes)
      if (pattern.includes('\\')) {
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(output)) {
            detected.push(pattern);
          }
        } catch {
          // Invalid regex, skip
        }
      } else {
        // Simple string match
        if (lowerOutput.includes(pattern.toLowerCase())) {
          detected.push(pattern);
        }
      }
    }

    return detected;
  }

  /**
   * Detects AI system prompt leakage in output.
   *
   * @param output - Output to check
   * @returns Array of detected leakage patterns
   * @private
   */
  private detectAILeakage(output: string): string[] {
    const detected: string[] = [];
    const lowerOutput = output.toLowerCase();

    for (const pattern of AI_LEAKAGE_PATTERNS) {
      if (lowerOutput.includes(pattern.toLowerCase())) {
        detected.push(pattern);
      }
    }

    return detected;
  }

  /**
   * Checks if output contains excessive repetitive content.
   *
   * @remarks
   * Detects patterns like:
   * - Same sentence repeated multiple times
   * - Same word repeated 5+ times consecutively
   * - Large blocks of identical text
   *
   * @param output - Output to check
   * @returns True if content is excessively repetitive
   * @private
   */
  private isRepetitiveContent(output: string): boolean {
    // Check for repeated words (5+ consecutive identical words)
    const words = output.split(/\s+/);
    let consecutiveCount = 1;
    let lastWord = '';

    for (const word of words) {
      if (word.toLowerCase() === lastWord.toLowerCase() && word.length > 3) {
        consecutiveCount++;
        if (consecutiveCount >= 5) {
          return true;
        }
      } else {
        consecutiveCount = 1;
      }
      lastWord = word;
    }

    // Check for repeated sentences
    const sentences = output.split(/[.!?]+/).filter((s) => s.trim().length > 20);
    const uniqueSentences = new Set(
      sentences.map((s) => s.trim().toLowerCase()),
    );

    // If less than 50% of sentences are unique, content is repetitive
    if (sentences.length > 5 && uniqueSentences.size / sentences.length < 0.5) {
      return true;
    }

    // Check for large repeated blocks (200+ chars repeated exactly)
    // Only check for very large repeated blocks to avoid false positives
    // with templated content that has similar structure
    const blockSize = 200;
    if (output.length > blockSize * 2) {
      for (let i = 0; i < Math.min(output.length - blockSize, 1000); i += 50) {
        const block = output.substring(i, i + blockSize);
        const restOfOutput = output.substring(i + blockSize);
        if (restOfOutput.includes(block)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validates JSON structure when expected.
   *
   * @param output - Output to validate as JSON
   * @param requiredFields - Fields that must be present
   * @returns Validation result
   * @private
   */
  private validateJsonStructure(
    output: string,
    requiredFields?: string[],
  ): { valid: boolean; reason?: string } {
    try {
      const parsed = JSON.parse(output);

      // Check required fields
      if (requiredFields && requiredFields.length > 0) {
        for (const field of requiredFields) {
          if (!(field in parsed)) {
            return {
              valid: false,
              reason: `Missing required field: ${field}`,
            };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Invalid JSON structure: ${error.message}`,
      };
    }
  }

  /**
   * Gets the maximum number of retries for a section type.
   *
   * @param sectionType - Type of section
   * @returns Maximum number of regeneration attempts
   */
  getMaxRetries(sectionType: string): number {
    const schema = getSchemaForSection(sectionType);
    return schema.maxRetries;
  }
}
