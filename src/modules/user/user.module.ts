import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from 'src/repositories/user.repository';
import HashPassword from 'src/commons/utils/hash-password.util';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    JwtService,
    HashPassword,
    RedisService,
  ],
})
export class UserModule {}
