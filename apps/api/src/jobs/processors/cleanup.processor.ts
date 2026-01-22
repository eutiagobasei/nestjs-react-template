import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache';
import { QUEUES, JOBS } from '../queues/queue.constants';

@Processor(QUEUES.CLEANUP)
export class CleanupProcessor {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  @Process(JOBS.CLEANUP_EXPIRED_TOKENS)
  async handleExpiredTokens(job: Job) {
    this.logger.log('Starting cleanup of expired refresh tokens');

    try {
      const result = await this.prisma.refreshToken.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);

      return { success: true, deletedCount: result.count };
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
  }

  @Process(JOBS.CLEANUP_INACTIVE_SESSIONS)
  async handleInactiveSessions(job: Job) {
    this.logger.log('Starting cleanup of inactive sessions');

    try {
      // Clear old session data from cache
      // This is a placeholder - implement based on your session strategy
      await this.cacheService.delByPrefix('session:');

      this.logger.log('Cleaned up inactive sessions from cache');

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to cleanup inactive sessions:', error);
      throw error;
    }
  }
}
