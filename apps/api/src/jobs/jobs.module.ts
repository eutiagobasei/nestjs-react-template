import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { EmailProcessor } from './processors/email.processor';
import { CleanupProcessor } from './processors/cleanup.processor';
import { QUEUES } from './queues/queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUES.EMAIL },
      { name: QUEUES.CLEANUP },
    ),
  ],
  providers: [JobsService, EmailProcessor, CleanupProcessor],
  exports: [JobsService],
})
export class JobsModule implements OnModuleInit {
  private readonly logger = new Logger(JobsModule.name);

  constructor(private jobsService: JobsService) {}

  async onModuleInit() {
    // Schedule recurring cleanup jobs on startup
    try {
      await this.jobsService.scheduleTokenCleanup();
      await this.jobsService.scheduleSessionCleanup();
      this.logger.log('Cleanup jobs scheduled successfully');
    } catch (error) {
      this.logger.error('Failed to schedule cleanup jobs:', error);
    }
  }
}
