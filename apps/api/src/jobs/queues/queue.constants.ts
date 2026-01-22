// Queue names
export const QUEUES = {
  EMAIL: 'email-queue',
  CLEANUP: 'cleanup-queue',
} as const;

// Job names
export const JOBS = {
  // Email jobs
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_PASSWORD_RESET: 'send-password-reset',
  SEND_NOTIFICATION: 'send-notification',

  // Cleanup jobs
  CLEANUP_EXPIRED_TOKENS: 'cleanup-expired-tokens',
  CLEANUP_INACTIVE_SESSIONS: 'cleanup-inactive-sessions',
} as const;

// Job options
export const JOB_OPTIONS = {
  EMAIL: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
  CLEANUP: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 60000, // 1 minute delay
    },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
} as const;
