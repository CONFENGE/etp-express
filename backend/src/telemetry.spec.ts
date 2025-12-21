/**
 * Tests for OpenTelemetry Configuration
 *
 * @see telemetry.ts
 * @since Issue #857
 * @updated Issue #859 - Added E2E validation tests
 */

import { otelSdk } from './telemetry';
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

describe('OpenTelemetry Configuration', () => {
  // Note: SDK is already started when telemetry.ts is imported
  // We test that it initializes without errors

  it('should have SDK defined and running', () => {
    expect(otelSdk).toBeDefined();
  });

  it('should export a NodeSDK instance', () => {
    // Check that otelSdk is the expected type
    expect(typeof otelSdk).toBe('object');
    expect(otelSdk.constructor.name).toBe('NodeSDK');
  });

  it('should have shutdown method available', () => {
    expect(typeof otelSdk.shutdown).toBe('function');
  });

  // Note: We don't call shutdown in tests as it would affect other tests
  // The SDK handles cleanup via process signals
});

describe('OpenTelemetry E2E Validation (#859)', () => {
  const tracer = trace.getTracer('etp-express-test');

  it('should create spans with the tracer API', () => {
    const span = tracer.startSpan('test-span');

    expect(span).toBeDefined();
    expect(typeof span.end).toBe('function');
    expect(typeof span.setAttribute).toBe('function');
    expect(typeof span.setStatus).toBe('function');

    span.end();
  });

  it('should support span attributes', () => {
    const span = tracer.startSpan('test-span-attributes');

    // Add various attribute types (LLM instrumentation pattern)
    span.setAttribute('test.string', 'value');
    span.setAttribute('test.number', 42);
    span.setAttribute('test.boolean', true);

    // Verify span context exists
    const spanContext = span.spanContext();
    expect(spanContext.traceId).toBeDefined();
    expect(spanContext.spanId).toBeDefined();
    expect(spanContext.traceId.length).toBe(32); // Valid trace ID format
    expect(spanContext.spanId.length).toBe(16); // Valid span ID format

    span.end();
  });

  it('should support span status for error tracking', () => {
    const span = tracer.startSpan('test-span-error');

    // Simulate error status (used in LLM error handling)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: 'Test error message',
    });

    span.end();
  });

  it('should support nested spans for trace hierarchy', () => {
    const parentSpan = tracer.startSpan('parent-operation');

    // Create child span in parent context
    const ctx = trace.setSpan(context.active(), parentSpan);
    const childSpan = tracer.startSpan('child-operation', undefined, ctx);

    // Verify parent-child relationship via trace ID
    expect(childSpan.spanContext().traceId).toBe(
      parentSpan.spanContext().traceId,
    );

    childSpan.end();
    parentSpan.end();
  });

  it('should support LLM-specific attributes pattern (#858)', () => {
    const span = tracer.startSpan('llm.chat_completion');

    // Simulate LLM instrumentation attributes
    span.setAttribute('llm.vendor', 'openai');
    span.setAttribute('llm.model', 'gpt-4.1-nano');
    span.setAttribute('llm.tokens.prompt', 100);
    span.setAttribute('llm.tokens.completion', 50);
    span.setAttribute('llm.tokens.total', 150);
    span.setAttribute('llm.request.temperature', 0.7);
    span.setAttribute('llm.request.max_tokens', 4000);

    span.end();
  });

  it('should get active span from context', () => {
    const span = tracer.startSpan('test-active-span');
    const ctx = trace.setSpan(context.active(), span);

    // Run code within span context
    context.with(ctx, () => {
      const activeSpan = trace.getActiveSpan();
      expect(activeSpan).toBeDefined();
      expect(activeSpan?.spanContext().spanId).toBe(span.spanContext().spanId);
    });

    span.end();
  });
});
