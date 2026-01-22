import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_TTL } from './cache.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl ?? CACHE_TTL.DEFAULT * 1000);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl ?? CACHE_TTL.DEFAULT}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern (prefix)
   */
  async delByPrefix(prefix: string): Promise<void> {
    try {
      const store = this.cacheManager.store as {
        keys?: (pattern: string) => Promise<string[]>;
      };
      if (store.keys) {
        const keys = await store.keys(`${prefix}*`);
        await Promise.all(keys.map((key) => this.cacheManager.del(key)));
        this.logger.debug(`Cache DEL by prefix: ${prefix} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Cache DEL by prefix error for ${prefix}:`, error);
    }
  }

  /**
   * Get or set - returns cached value or computes and caches it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T | undefined> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    if (value !== undefined && value !== null) {
      await this.set(key, value, ttl);
    }
    return value;
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.debug('Cache RESET: all keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }
}
