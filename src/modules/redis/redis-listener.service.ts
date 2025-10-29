import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisListenerService implements OnModuleInit {
  private readonly logger = new Logger(RedisListenerService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleInit() {
    const subscriber = this.redis.duplicate();
    // await subscriber.connect();

    // Subscribe to key expiration events
    await subscriber.psubscribe('__keyevent@0__:expired');

    subscriber.on('pmessage', async (pattern, channel, message) => {
      this.logger.log(`Key expired: ${message}`);

      // Example: handle based on key name
      if (message.startsWith('user:session:')) {
        const userId = message.split(':')[2];
        await this.handleSessionExpired(userId);
      }
    });
  }

  async handleSessionExpired(userId: string) {
    this.logger.warn(`Session expired for user ${userId}`);
    // Do something, like updating database status, etc.
  }
}
