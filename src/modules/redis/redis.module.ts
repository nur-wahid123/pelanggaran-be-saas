import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        const client = new Redis({
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️  Flushing Redis on startup...');
          await client.flushall();
        }
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
