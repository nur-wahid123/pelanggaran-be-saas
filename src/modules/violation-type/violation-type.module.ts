import { Module } from '@nestjs/common';
import { ViolationTypeService } from './violation-type.service';
import { ViolationTypeController } from './violation-type.controller';
import { ViolationTypeRepository } from 'src/repositories/violation-type.repository';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { LoggerRepository } from 'src/repositories/logger.repository';

@Module({
  controllers: [ViolationTypeController],
  providers: [
    ViolationTypeService,
    JwtService,
    ViolationTypeRepository,
    RedisService,
    LoggerService,
    LoggerRepository,
  ],
})
export class ViolationTypeModule {}
