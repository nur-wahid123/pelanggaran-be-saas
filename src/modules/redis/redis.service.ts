import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly enabled: boolean;
  private readonly ttl: number;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    redis.reset();
    this.enabled = process.env.USE_REDIS === 'true';
    this.ttl = process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : 20;
  }

  async get(key: string): Promise<any | null> {
    if (!this.enabled) return null; // Redis disabled
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.enabled) return; // Skip writing
    await this.redis.set(key, JSON.stringify(value), 'EX', this.ttl);
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) return;
    await this.redis.del(key);
  }

  async updateRedis(cacheKey: string) {
    const versionKey = cacheKey;
    let version = await this.redis.get(versionKey);
    if (!version) {
      version = '1';
      await this.redis.set(versionKey, version);
    }
    await this.redis.incr(versionKey);
  }

  async getVersion(cacheKey: string) {
    const versionKey = cacheKey;
    let version = await this.redis.get(versionKey);
    if (!version) {
      version = '1';
      await this.redis.set(versionKey, version);
    }
    return version;
  }
}
