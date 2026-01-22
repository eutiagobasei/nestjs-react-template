// Cache key prefixes
export const CACHE_KEYS = {
  USER: 'user',
  USER_BY_EMAIL: 'user:email',
  REFRESH_TOKEN: 'refresh_token',
  SESSION: 'session',
} as const;

// Cache TTL values in seconds
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  USER_BY_EMAIL: 300, // 5 minutes
  REFRESH_TOKEN: 604800, // 7 days (same as refresh token expiry)
  SESSION: 900, // 15 minutes
  DEFAULT: 300, // 5 minutes
} as const;

// Cache helper functions
export function getUserCacheKey(userId: string): string {
  return `${CACHE_KEYS.USER}:${userId}`;
}

export function getUserByEmailCacheKey(email: string): string {
  return `${CACHE_KEYS.USER_BY_EMAIL}:${email}`;
}

export function getRefreshTokenCacheKey(token: string): string {
  return `${CACHE_KEYS.REFRESH_TOKEN}:${token}`;
}

export function getSessionCacheKey(sessionId: string): string {
  return `${CACHE_KEYS.SESSION}:${sessionId}`;
}
