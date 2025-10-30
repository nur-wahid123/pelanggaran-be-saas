import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisHelper {
  constructor(cacheKey: string, redis: Redis) {
    this.cacheKey = cacheKey;
    this.redis = redis;
  }

  private cacheKey = '';
  private redis: Redis;

  public async updateRedis() {
    const versionKey = this.cacheKey;
    let version = await this.redis.get(versionKey);
    if (!version) {
      version = '1';
      await this.redis.set(versionKey, version);
    }
    await this.redis.incr(versionKey);
  }

  public async getVersion() {
    const versionKey = this.cacheKey;
    let version = await this.redis.get(versionKey);
    if (!version) {
      version = '1';
      await this.redis.set(versionKey, version);
    }
    return version;
  }
}
