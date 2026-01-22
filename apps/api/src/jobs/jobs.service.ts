import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUES, JOBS, JOB_OPTIONS } from './queues/queue.constants';
import {
  WelcomeEmailJobData,
  PasswordResetJobData,
  NotificationJobData,
} from './processors/email.processor';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue(QUEUES.EMAIL) private emailQueue: Queue,
    @InjectQueue(QUEUES.CLEANUP) private cleanupQueue: Queue,
  ) {}

  /**
   * Add welcome email job to queue
   */
  async sendWelcomeEmail(data: WelcomeEmailJobData) {
    const job = await this.emailQueue.add(JOBS.SEND_WELCOME_EMAIL, data, {
      ...JOB_OPTIONS.EMAIL,
    });

    this.logger.log(`Welcome email job added: ${job.id}`);
    return job;
  }

  /**
   * Add password reset email job to queue
   */
  async sendPasswordResetEmail(data: PasswordResetJobData) {
    const job = await this.emailQueue.add(JOBS.SEND_PASSWORD_RESET, data, {
      ...JOB_OPTIONS.EMAIL,
      priority: 1, // Higher priority for password resets
    });

    this.logger.log(`Password reset email job added: ${job.id}`);
    return job;
  }

  /**
   * Add notification email job to queue
   */
  async sendNotification(data: NotificationJobData) {
    const job = await this.emailQueue.add(JOBS.SEND_NOTIFICATION, data, {
      ...JOB_OPTIONS.EMAIL,
    });

    this.logger.log(`Notification job added: ${job.id}`);
    return job;
  }

  /**
   * Schedule cleanup of expired tokens
   * Call this on application bootstrap to set up recurring cleanup
   */
  async scheduleTokenCleanup() {
    // Remove any existing repeatable jobs
    const repeatableJobs = await this.cleanupQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === JOBS.CLEANUP_EXPIRED_TOKENS) {
        await this.cleanupQueue.removeRepeatableByKey(job.key);
      }
    }

    // Schedule new repeatable job - runs every hour
    const job = await this.cleanupQueue.add(
      JOBS.CLEANUP_EXPIRED_TOKENS,
      {},
      {
        ...JOB_OPTIONS.CLEANUP,
        repeat: {
          cron: '0 * * * *', // Every hour at minute 0
        },
      },
    );

    this.logger.log(`Token cleanup job scheduled: ${job.id}`);
    return job;
  }

  /**
   * Schedule cleanup of inactive sessions
   */
  async scheduleSessionCleanup() {
    // Remove any existing repeatable jobs
    const repeatableJobs = await this.cleanupQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === JOBS.CLEANUP_INACTIVE_SESSIONS) {
        await this.cleanupQueue.removeRepeatableByKey(job.key);
      }
    }

    // Schedule new repeatable job - runs every 6 hours
    const job = await this.cleanupQueue.add(
      JOBS.CLEANUP_INACTIVE_SESSIONS,
      {},
      {
        ...JOB_OPTIONS.CLEANUP,
        repeat: {
          cron: '0 */6 * * *', // Every 6 hours
        },
      },
    );

    this.logger.log(`Session cleanup job scheduled: ${job.id}`);
    return job;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [emailStats, cleanupStats] = await Promise.all([
      this.getQueueInfo(this.emailQueue),
      this.getQueueInfo(this.cleanupQueue),
    ]);

    return {
      email: emailStats,
      cleanup: cleanupStats,
    };
  }

  private async getQueueInfo(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queue.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}
