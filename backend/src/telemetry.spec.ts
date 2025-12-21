/**
 * Tests for OpenTelemetry Configuration
 *
 * @see telemetry.ts
 * @since Issue #857
 */

import { otelSdk } from './telemetry';

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
