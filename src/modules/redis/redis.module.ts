import { Global, Module, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const isEnabled = process.env.USE_REDIS === 'true';
        if (!isEnabled) {
          logger.log('ℹ️ Redis is disabled (USE_REDIS is false).');
          return null;
        }

        try {
          const client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT ? +process.env.REDIS_PORT : 6379,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
          });

          client.on('error', (err) => {
            logger.warn(`Redis connection error: ${err.message}`);
          });

          await client.connect();

          if (process.env.NODE_ENV === 'development') {
            logger.log('⚠️  Flushing Redis on startup...');
            await client.flushall();
          }
          return client;
        } catch (error: any) {
          logger.error(`Failed to connect to Redis: ${error.message}`);
          return null;
        }
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

