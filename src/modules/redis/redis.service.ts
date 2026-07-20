import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly enabled: boolean;
  private readonly ttl: number;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis | null) {
    this.enabled = process.env.USE_REDIS === 'true' && !!this.redis;
    this.ttl = process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : 20;

    if (this.enabled && this.redis) {
      try {
        this.redis.reset();
      } catch (err: any) {
        this.logger.warn(`Failed to reset redis connection: ${err.message}`);
      }
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.enabled || !this.redis) return null; // Redis disabled
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err: any) {
      this.logger.warn(`Redis GET error for key ${key}: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.enabled || !this.redis) return; // Skip writing
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', this.ttl);
    } catch (err: any) {
      this.logger.warn(`Redis SET error for key ${key}: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      await this.redis.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis DEL error for key ${key}: ${err.message}`);
    }
  }

  async updateRedis(cacheKey: string): Promise<void> {
    if (!this.enabled || !this.redis) return;
    try {
      const versionKey = cacheKey;
      let version = await this.redis.get(versionKey);
      if (!version) {
        version = '1';
        await this.redis.set(versionKey, version);
      }
      await this.redis.incr(versionKey);
    } catch (err: any) {
      this.logger.warn(`Redis updateRedis error for key ${cacheKey}: ${err.message}`);
    }
  }

  async getVersion(cacheKey: string): Promise<string> {
    if (!this.enabled || !this.redis) return '1';
    try {
      const versionKey = cacheKey;
      let version = await this.redis.get(versionKey);
      if (!version) {
        version = '1';
        await this.redis.set(versionKey, version);
      }
      return version;
    } catch (err: any) {
      this.logger.warn(`Redis getVersion error for key ${cacheKey}: ${err.message}`);
      return '1';
    }
  }
}

