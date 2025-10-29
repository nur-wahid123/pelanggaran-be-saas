import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ViolationModule } from './modules/violation/violation.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from './commons/configs/database.config';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { ViolationTypeModule } from './modules/violation-type/violation-type.module';
import { StudentModule } from './modules/student/student.module';
import { ClassesModule } from './modules/classes/classes.module';
import { UserModule } from './modules/user/user.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ImageModule } from './modules/image/image.module';
import { LoggerMiddleware } from './commons/interceptors/logger.interceptor';
import { ViolationService } from './modules/violation/violation.service';
import { ViolationRepository } from './repositories/violation.repository';
import { SchoolModule } from './modules/school/school.module';
import { JwtService } from '@nestjs/jwt';
import { RedisModule } from './modules/redis/redis.module';
import { RedisListenerService } from './modules/redis/redis-listener.service';
import { RedisService } from './modules/redis/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    ViolationModule,
    AuthModule,
    ImageModule,
    ViolationModule,
    ViolationTypeModule,
    StudentModule,
    ClassesModule,
    UserModule,
    DashboardModule,
    SchoolModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [
    JwtService,
    AppService,
    ViolationRepository,
    ViolationService,
    ViolationModule,
    RedisListenerService,
    RedisService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*'); // Apply to all routes
  }
}
