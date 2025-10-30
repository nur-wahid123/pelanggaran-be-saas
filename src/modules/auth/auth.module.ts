import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepository } from 'src/repositories/user.repository';
import { JwtModule } from '@nestjs/jwt';
import HashPassword from 'src/commons/utils/hash-password.util';
import { JwtStrategy } from './jwt.strategy';
import { ViolationRepository } from 'src/repositories/violation.repository';
import { LoggerService } from '../logger/logger.service';
import { LoggerRepository } from 'src/repositories/logger.repository';
import { ImageService } from '../image/image.service';
import { ImageLinkRepository } from 'src/repositories/image-link.repository';
import { ImageRepository } from 'src/repositories/image.repository';
import { MinioService } from '../violation/minio.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    HashPassword,
    JwtStrategy,
    ViolationRepository,
    ImageService,
    ImageLinkRepository,
    ImageRepository,
    MinioService,
    LoggerService,
    LoggerRepository,
  ],
  imports: [
    JwtModule.register({
      secret: process.env.USER_KEY_SECRET,
      signOptions: { expiresIn: '2h' },
    }),
  ],
})
export class AuthModule {}
