import { Module } from '@nestjs/common';
import { SchoolService } from './school.service';
import { SchoolController } from './school.controller';
import { SchoolRepository } from 'src/repositories/school.repository';
import { UserRepository } from 'src/repositories/user.repository';
import HashPassword from 'src/commons/utils/hash-password.util';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [SchoolController],
  providers: [
    SchoolService,
    SchoolRepository,
    UserRepository,
    JwtService,
    HashPassword,
    RedisService,
  ],
})
export class SchoolModule {}
