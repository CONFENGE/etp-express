import { Test, TestingModule } from '@nestjs/testing';
import { SectionProgressService } from './section-progress.service';
import { ProgressEvent } from './interfaces/progress-event.interface';
import { firstValueFrom, take, toArray, timeout } from 'rxjs';

describe('SectionProgressService', () => {
  let service: SectionProgressService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SectionProgressService],
    }).compile();

    service = module.get<SectionProgressService>(SectionProgressService);
  });

  afterEach(() => {
    // Clean up any remaining streams
    // The service doesn't expose a cleanup all method, but streams auto-complete
  });

  describe('createProgressStream', () => {
    it('should create a new progress stream for a job', () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      expect(stream).toBeDefined();
      expect(service.hasStream(jobId)).toBe(true);
    });

    it('should clean up existing stream when creating new one with same jobId', () => {
      const jobId = 'test-job-123';

      // Create first stream
      const stream1 = service.createProgressStream(jobId);

      // Create second stream with same ID (should clean up first)
      const stream2 = service.createProgressStream(jobId);

      expect(stream2).toBeDefined();
      expect(service.hasStream(jobId)).toBe(true);
      expect(service.getActiveStreamCount()).toBe(1);
    });

    it('should return Observable that emits SSE MessageEvent format', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      const progressEvent: ProgressEvent = {
        phase: 'generation',
        step: 3,
        totalSteps: 5,
        message: 'Test message',
        percentage: 50,
        timestamp: Date.now(),
      };

      // Set up subscription to capture the event
      const eventPromise = firstValueFrom(stream.pipe(take(1)));

      // Emit the event
      service.emitProgress(jobId, progressEvent);

      // Complete the stream to ensure the promise resolves
      service.completeStream(jobId);

      const receivedEvent = await eventPromise;

      expect(receivedEvent).toEqual({
        data: progressEvent,
        id: `${jobId}-${progressEvent.step}`,
        type: 'progress',
      });
    });
  });

  describe('emitProgress', () => {
    it('should emit progress event to existing stream', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      const events: any[] = [];
      const subscription = stream.subscribe((event) => events.push(event));

      const progressEvent: ProgressEvent = {
        phase: 'validation',
        step: 4,
        totalSteps: 5,
        message: 'Validating...',
        percentage: 80,
        timestamp: Date.now(),
      };

      service.emitProgress(jobId, progressEvent);

      // Wait a tick for the event to be processed
      await new Promise((resolve) => setImmediate(resolve));

      expect(events.length).toBe(1);
      expect(events[0].data).toEqual(progressEvent);

      subscription.unsubscribe();
      service.completeStream(jobId);
    });

    it('should silently ignore emit for non-existent stream', () => {
      const jobId = 'non-existent-job';
      const progressEvent: ProgressEvent = {
        phase: 'generation',
        step: 3,
        totalSteps: 5,
        message: 'Test',
        percentage: 50,
        timestamp: Date.now(),
      };

      // Should not throw
      expect(() => service.emitProgress(jobId, progressEvent)).not.toThrow();
    });

    it('should emit multiple events in order', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      const eventsPromise = firstValueFrom(stream.pipe(take(3), toArray()));

      const events: ProgressEvent[] = [
        {
          phase: 'sanitization',
          step: 1,
          totalSteps: 5,
          message: 'Step 1',
          percentage: 10,
          timestamp: Date.now(),
        },
        {
          phase: 'enrichment',
          step: 2,
          totalSteps: 5,
          message: 'Step 2',
          percentage: 25,
          timestamp: Date.now(),
        },
        {
          phase: 'generation',
          step: 3,
          totalSteps: 5,
          message: 'Step 3',
          percentage: 50,
          timestamp: Date.now(),
        },
      ];

      events.forEach((event) => service.emitProgress(jobId, event));

      const receivedEvents = await eventsPromise;

      expect(receivedEvents.length).toBe(3);
      expect(receivedEvents[0].data.phase).toBe('sanitization');
      expect(receivedEvents[1].data.phase).toBe('enrichment');
      expect(receivedEvents[2].data.phase).toBe('generation');

      service.completeStream(jobId);
    });
  });

  describe('completeStream', () => {
    it('should complete the stream and clean up', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      let completed = false;
      stream.subscribe({
        complete: () => {
          completed = true;
        },
      });

      service.completeStream(jobId);

      // Wait a tick for the completion to be processed
      await new Promise((resolve) => setImmediate(resolve));

      expect(completed).toBe(true);
      expect(service.hasStream(jobId)).toBe(false);
    });

    it('should not throw when completing non-existent stream', () => {
      expect(() => service.completeStream('non-existent')).not.toThrow();
    });
  });

  describe('errorStream', () => {
    it('should emit error event and complete the stream', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      const eventsPromise = firstValueFrom(stream.pipe(take(1)));

      const error = new Error('Test error message');
      service.errorStream(jobId, error);

      const receivedEvent = await eventsPromise;

      expect(receivedEvent.data.phase).toBe('error');
      expect(receivedEvent.data.message).toBe('Test error message');
      expect(receivedEvent.data.details?.error).toBe('Test error message');
      expect(service.hasStream(jobId)).toBe(false);
    });

    it('should not throw when erroring non-existent stream', () => {
      const error = new Error('Test error');
      expect(() => service.errorStream('non-existent', error)).not.toThrow();
    });
  });

  describe('hasStream', () => {
    it('should return true for existing stream', () => {
      const jobId = 'test-job-123';
      service.createProgressStream(jobId);

      expect(service.hasStream(jobId)).toBe(true);
    });

    it('should return false for non-existent stream', () => {
      expect(service.hasStream('non-existent')).toBe(false);
    });

    it('should return false after stream completion', () => {
      const jobId = 'test-job-123';
      service.createProgressStream(jobId);
      service.completeStream(jobId);

      expect(service.hasStream(jobId)).toBe(false);
    });
  });

  describe('getActiveStreamCount', () => {
    it('should return 0 when no streams exist', () => {
      expect(service.getActiveStreamCount()).toBe(0);
    });

    it('should return correct count of active streams', () => {
      service.createProgressStream('job-1');
      service.createProgressStream('job-2');
      service.createProgressStream('job-3');

      expect(service.getActiveStreamCount()).toBe(3);

      service.completeStream('job-1');

      expect(service.getActiveStreamCount()).toBe(2);
    });
  });

  describe('progress event details', () => {
    it('should include optional details in progress event', async () => {
      const jobId = 'test-job-123';
      const stream = service.createProgressStream(jobId);

      const eventPromise = firstValueFrom(stream.pipe(take(1)));

      const progressEvent: ProgressEvent = {
        phase: 'enrichment',
        step: 2,
        totalSteps: 5,
        message: 'Getting market data...',
        percentage: 25,
        timestamp: Date.now(),
        details: {
          enrichmentSource: 'gov-api',
          agents: ['gov-search-service'],
        },
      };

      service.emitProgress(jobId, progressEvent);
      service.completeStream(jobId);

      const receivedEvent = await eventPromise;

      expect(receivedEvent.data.details).toEqual({
        enrichmentSource: 'gov-api',
        agents: ['gov-search-service'],
      });
    });
  });
});
