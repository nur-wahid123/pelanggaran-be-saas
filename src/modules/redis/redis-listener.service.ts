import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisListenerService implements OnModuleInit {
  private readonly logger = new Logger(RedisListenerService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis | null) { }

  async onModuleInit() {
    if (process.env.USE_REDIS !== 'true' || !this.redis) {
      this.logger.log('Redis listener is disabled.');
      return;
    }

    try {
      const subscriber = this.redis.duplicate();
      subscriber.on('error', (err) => {
        this.logger.warn(`Redis listener subscriber error: ${err.message}`);
      });

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
    } catch (err: any) {
      this.logger.error(`Failed to initialize Redis listener: ${err.message}`);
    }
  }

  async handleSessionExpired(userId: string) {
    this.logger.warn(`Session expired for user ${userId}`);
    // Do something, like updating database status, etc.
  }
}

