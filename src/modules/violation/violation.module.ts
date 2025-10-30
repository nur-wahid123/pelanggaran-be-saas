import { Module } from '@nestjs/common';
import { ViolationService } from './violation.service';
import { ViolationController } from './violation.controller';
import { ViolationRepository } from 'src/repositories/violation.repository';
import { ImageService } from '../image/image.service';
import { ImageRepository } from 'src/repositories/image.repository';
import { ImageLinkRepository } from 'src/repositories/image-link.repository';
import { MinioService } from './minio.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { LoggerRepository } from 'src/repositories/logger.repository';

@Module({
  controllers: [ViolationController],
  providers: [
    ViolationService,
    ImageService,
    ImageRepository,
    ImageLinkRepository,
    MinioService,
    JwtService,
    ViolationRepository,
    RedisService,
    LoggerService,
    LoggerRepository,
  ],
})
export class ViolationModule {}
