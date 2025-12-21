import { SlowQuerySubscriber } from './slow-query.subscriber';

describe('SlowQuerySubscriber', () => {
  let subscriber: SlowQuerySubscriber;

  beforeEach(() => {
    subscriber = new SlowQuerySubscriber();
  });

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  it('should have afterLoad method', () => {
    expect(typeof subscriber.afterLoad).toBe('function');
  });

  it('should have afterInsert method', () => {
    expect(typeof subscriber.afterInsert).toBe('function');
  });

  it('should have afterUpdate method', () => {
    expect(typeof subscriber.afterUpdate).toBe('function');
  });

  it('should have afterRemove method', () => {
    expect(typeof subscriber.afterRemove).toBe('function');
  });

  it('should not throw on afterLoad', () => {
    expect(() => subscriber.afterLoad({})).not.toThrow();
  });

  it('should not throw on afterInsert with mock event', () => {
    const mockEvent = {
      metadata: { tableName: 'test_table' },
    };
    expect(() => subscriber.afterInsert(mockEvent as any)).not.toThrow();
  });

  it('should not throw on afterUpdate with mock event', () => {
    const mockEvent = {
      metadata: { tableName: 'test_table' },
    };
    expect(() => subscriber.afterUpdate(mockEvent as any)).not.toThrow();
  });

  it('should not throw on afterRemove with mock event', () => {
    const mockEvent = {
      metadata: { tableName: 'test_table' },
    };
    expect(() => subscriber.afterRemove(mockEvent as any)).not.toThrow();
  });
});
