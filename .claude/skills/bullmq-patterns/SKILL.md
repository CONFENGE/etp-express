# BullMQ Patterns Skill

## Activation

Esta skill e ativada automaticamente quando voce trabalha com jobs, workers, queues ou processamento assincrono.

---

## Stack do Projeto

- **BullMQ 5.x** - Job queue
- **Redis** - Backend de filas
- **ioredis** - Cliente Redis

---

## Estrutura de Modulo Queue

```
backend/src/modules/queue/
├── queue.module.ts
├── queue.service.ts
├── processors/
│   ├── section-generation.processor.ts
│   └── pdf-export.processor.ts
├── jobs/
│   ├── section-generation.job.ts
│   └── pdf-export.job.ts
└── queue.constants.ts
```

---

## Configuracao

### queue.constants.ts

```typescript
export const QUEUE_NAMES = {
  SECTION_GENERATION: 'section-generation',
  PDF_EXPORT: 'pdf-export',
  EMAIL_NOTIFICATION: 'email-notification',
} as const;

export const JOB_NAMES = {
  GENERATE_SECTION: 'generate-section',
  EXPORT_PDF: 'export-pdf',
  SEND_EMAIL: 'send-email',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 horas
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 dias
  },
};
```

### queue.module.ts

```typescript
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SECTION_GENERATION },
      { name: QUEUE_NAMES.PDF_EXPORT },
    ),
  ],
  providers: [QueueService, SectionGenerationProcessor, PdfExportProcessor],
  exports: [QueueService],
})
export class QueueModule {}
```

---

## Producers

### queue.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from './queue.constants';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.SECTION_GENERATION)
    private readonly sectionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PDF_EXPORT)
    private readonly pdfQueue: Queue,
  ) {}

  async addSectionGenerationJob(data: SectionGenerationJobData): Promise<Job> {
    this.logger.log(`Adding section generation job for ETP ${data.etpId}`);
    return this.sectionQueue.add(JOB_NAMES.GENERATE_SECTION, data, {
      ...DEFAULT_JOB_OPTIONS,
      priority: data.priority || 5,
      jobId: `section-${data.etpId}-${data.sectionType}-${Date.now()}`,
    });
  }

  async addPdfExportJob(data: PdfExportJobData): Promise<Job> {
    return this.pdfQueue.add(JOB_NAMES.EXPORT_PDF, data, {
      ...DEFAULT_JOB_OPTIONS,
      priority: 10, // Alta prioridade para exports
    });
  }

  async getJobStatus(queueName: string, jobId: string): Promise<JobStatus> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
      return { status: 'not_found' };
    }
    const state = await job.getState();
    return {
      status: state,
      progress: job.progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.SECTION_GENERATION:
        return this.sectionQueue;
      case QUEUE_NAMES.PDF_EXPORT:
        return this.pdfQueue;
      default:
        throw new Error(`Queue ${name} not found`);
    }
  }
}
```

---

## Consumers (Processors)

### section-generation.processor.ts

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';

@Processor(QUEUE_NAMES.SECTION_GENERATION)
export class SectionGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(SectionGenerationProcessor.name);

  async process(job: Job<SectionGenerationJobData>): Promise<SectionResult> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    try {
      // Update progress
      await job.updateProgress(10);

      // Step 1: Prepare context
      const context = await this.prepareContext(job.data);
      await job.updateProgress(30);

      // Step 2: Generate content
      const content = await this.generateContent(job.data, context);
      await job.updateProgress(70);

      // Step 3: Validate and save
      const result = await this.saveSection(job.data, content);
      await job.updateProgress(100);

      this.logger.log(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }

  private async prepareContext(
    data: SectionGenerationJobData,
  ): Promise<Context> {
    // Implementacao
  }

  private async generateContent(
    data: SectionGenerationJobData,
    context: Context,
  ): Promise<string> {
    // Implementacao
  }

  private async saveSection(
    data: SectionGenerationJobData,
    content: string,
  ): Promise<SectionResult> {
    // Implementacao
  }
}
```

---

## Job Data Interfaces

```typescript
export interface SectionGenerationJobData {
  etpId: string;
  sectionType: SectionType;
  userId: string;
  organizationId: string;
  priority?: number;
  context?: Record<string, unknown>;
}

export interface PdfExportJobData {
  etpId: string;
  userId: string;
  format: 'pdf' | 'docx';
  options?: {
    includeAnnexes?: boolean;
    watermark?: string;
  };
}

export interface JobStatus {
  status:
    | 'waiting'
    | 'active'
    | 'completed'
    | 'failed'
    | 'delayed'
    | 'not_found';
  progress?: number | object;
  data?: unknown;
  result?: unknown;
  failedReason?: string;
}
```

---

## Retry Strategies

```typescript
// Exponential backoff
const exponentialBackoff = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s, 8s, 16s
  },
};

// Fixed delay
const fixedDelay = {
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000, // 5s entre tentativas
  },
};

// Custom backoff
const customBackoff = {
  attempts: 5,
  backoff: {
    type: 'custom',
  },
};

// No processor:
async process(job: Job) {
  if (job.opts.backoff?.type === 'custom') {
    // Custom logic baseada em job.attemptsMade
    const delay = Math.min(1000 * Math.pow(2, job.attemptsMade), 60000);
    await job.moveToDelayed(Date.now() + delay);
    return;
  }
}
```

---

## Monitoring

### Health Check

```typescript
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(
    @InjectQueue(QUEUE_NAMES.SECTION_GENERATION)
    private readonly queue: Queue,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const waiting = await this.queue.getWaitingCount();
    const active = await this.queue.getActiveCount();
    const failed = await this.queue.getFailedCount();

    const isHealthy = failed < 100; // Threshold

    return this.getStatus(key, isHealthy, {
      waiting,
      active,
      failed,
    });
  }
}
```

### Metrics

```typescript
async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
  const queue = this.getQueue(queueName);
  return {
    waiting: await queue.getWaitingCount(),
    active: await queue.getActiveCount(),
    completed: await queue.getCompletedCount(),
    failed: await queue.getFailedCount(),
    delayed: await queue.getDelayedCount(),
  };
}
```

---

## Regras do Projeto

1. **Sempre use job IDs unicos** - Para rastreabilidade
2. **Sempre atualize progress** - Para feedback ao usuario
3. **Sempre logue eventos** - Para debugging
4. **Sempre configure retry** - Com backoff exponential
5. **Sempre limpe jobs antigos** - removeOnComplete/removeOnFail
6. **Sempre valide dados** - Antes de processar
