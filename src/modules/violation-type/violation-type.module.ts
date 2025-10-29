import { Module } from '@nestjs/common';
import { ViolationTypeService } from './violation-type.service';
import { ViolationTypeController } from './violation-type.controller';
import { ViolationTypeRepository } from 'src/repositories/violation-type.repository';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [ViolationTypeController],
  providers: [
    ViolationTypeService,
    JwtService,
    ViolationTypeRepository,
    RedisService,
  ],
})
export class ViolationTypeModule {}
