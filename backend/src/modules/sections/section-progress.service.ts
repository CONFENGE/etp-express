import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, map, takeUntil, timer } from 'rxjs';
import {
 ProgressEvent,
 SseMessageEvent,
} from './interfaces/progress-event.interface';

/**
 * Service responsible for managing SSE progress streams for section generation.
 *
 * @remarks
 * This service provides a pub/sub mechanism for progress events during AI-powered
 * section generation. It allows the OrchestratorService to emit progress events
 * that are streamed to clients via Server-Sent Events.
 *
 * Key features:
 * - Creates and manages Observable streams per generation job
 * - Automatic cleanup after stream completion or timeout (5 minutes max)
 * - Memory leak prevention with Subject cleanup
 * - Thread-safe event emission
 *
 * Usage:
 * 1. Controller creates a stream via `createProgressStream(jobId)`
 * 2. OrchestratorService emits events via `emitProgress(jobId, event)`
 * 3. Controller streams the Observable to the client as SSE
 * 4. On completion/error, call `completeStream(jobId)` for cleanup
 *
 * @see SectionsController - SSE endpoint consumer
 * @see OrchestratorService - Event producer
 * @see #754 - SSE streaming implementation
 */
@Injectable()
export class SectionProgressService {
 private readonly logger = new Logger(SectionProgressService.name);

 /**
 * Map of active progress streams indexed by job ID.
 */
 private readonly progressSubjects = new Map<string, Subject<ProgressEvent>>();

 /**
 * Maximum stream lifetime in milliseconds (5 minutes).
 * Prevents memory leaks from abandoned connections.
 */
 private readonly MAX_STREAM_LIFETIME_MS = 5 * 60 * 1000;

 /**
 * Creates a new progress stream for a generation job.
 *
 * @remarks
 * The stream automatically completes after MAX_STREAM_LIFETIME_MS to prevent
 * memory leaks from abandoned client connections. The stream is also removed
 * from the map when completed or errored.
 *
 * @param jobId - Unique identifier for the generation job
 * @returns Observable that emits SSE-formatted MessageEvents
 */
 createProgressStream(jobId: string): Observable<SseMessageEvent> {
 // Clean up any existing stream for this job ID
 this.cleanupStream(jobId);

 const subject = new Subject<ProgressEvent>();
 this.progressSubjects.set(jobId, subject);

 this.logger.log(`Created progress stream for job ${jobId}`);

 // Create timeout observable for automatic cleanup
 const timeout$ = timer(this.MAX_STREAM_LIFETIME_MS);

 return subject.pipe(
 // Auto-complete after timeout
 takeUntil(timeout$),
 // Transform to SSE MessageEvent format
 map((event) => ({
 data: event,
 id: `${jobId}-${event.step}`,
 type: 'progress',
 })),
 );
 }

 /**
 * Emits a progress event to the stream for a specific job.
 *
 * @remarks
 * If no stream exists for the job ID, the event is silently ignored.
 * This allows the OrchestratorService to emit events without checking
 * if a stream was requested (fire-and-forget pattern).
 *
 * @param jobId - Unique identifier for the generation job
 * @param event - Progress event to emit
 */
 emitProgress(jobId: string, event: ProgressEvent): void {
 const subject = this.progressSubjects.get(jobId);

 if (subject) {
 subject.next(event);
 this.logger.debug(
 `Progress event emitted for job ${jobId}: ${event.phase} (${event.percentage}%)`,
 );
 }
 }

 /**
 * Completes the progress stream for a job and cleans up resources.
 *
 * @remarks
 * Should be called when generation completes (success or error).
 * This signals to the client that the stream is finished.
 *
 * @param jobId - Unique identifier for the generation job
 */
 completeStream(jobId: string): void {
 const subject = this.progressSubjects.get(jobId);

 if (subject) {
 subject.complete();
 this.progressSubjects.delete(jobId);
 this.logger.log(`Progress stream completed for job ${jobId}`);
 }
 }

 /**
 * Signals an error on the progress stream and cleans up.
 *
 * @param jobId - Unique identifier for the generation job
 * @param error - Error to emit before closing the stream
 */
 errorStream(jobId: string, error: Error): void {
 const subject = this.progressSubjects.get(jobId);

 if (subject) {
 // Emit error event before closing
 subject.next({
 phase: 'error',
 step: 0,
 totalSteps: 5,
 message: error.message || 'Erro durante geração',
 percentage: 0,
 timestamp: Date.now(),
 details: {
 error: error.message,
 },
 });
 subject.complete();
 this.progressSubjects.delete(jobId);
 this.logger.warn(
 `Progress stream errored for job ${jobId}: ${error.message}`,
 );
 }
 }

 /**
 * Checks if a progress stream exists for a job.
 *
 * @param jobId - Unique identifier for the generation job
 * @returns True if stream exists and is active
 */
 hasStream(jobId: string): boolean {
 return this.progressSubjects.has(jobId);
 }

 /**
 * Gets the count of active streams (for monitoring).
 *
 * @returns Number of active progress streams
 */
 getActiveStreamCount(): number {
 return this.progressSubjects.size;
 }

 /**
 * Cleans up a stream if it exists.
 *
 * @param jobId - Unique identifier for the generation job
 */
 private cleanupStream(jobId: string): void {
 const existing = this.progressSubjects.get(jobId);
 if (existing) {
 existing.complete();
 this.progressSubjects.delete(jobId);
 this.logger.debug(`Cleaned up existing stream for job ${jobId}`);
 }
 }
}
