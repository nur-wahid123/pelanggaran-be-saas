import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from 'src/repositories/student.repository';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { LoggerRepository } from 'src/repositories/logger.repository';

@Module({
  controllers: [StudentController],
  providers: [
    StudentService,
    StudentRepository,
    JwtService,
    RedisService,
    LoggerService,
    LoggerRepository,
  ],
})
export class StudentModule {}
