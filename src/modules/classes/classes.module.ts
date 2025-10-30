import { Module } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ClassRepository } from 'src/repositories/classes.repository';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { LoggerRepository } from 'src/repositories/logger.repository';

@Module({
  controllers: [ClassesController],
  providers: [
    ClassesService,
    JwtService,
    ClassRepository,
    RedisService,
    LoggerService,
    LoggerRepository,
  ],
})
export class ClassesModule {}
