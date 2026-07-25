import { Module } from '@nestjs/common';
import { SchoolModeService } from './school-mode.service';
import { SchoolModeController } from './school-mode.controller';
import { SchoolModeRepository } from 'src/repositories/school-mode.repository';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [SchoolModeController],
  providers: [
    SchoolModeService,
    SchoolModeRepository,
    JwtService,
  ],
  exports: [SchoolModeService, SchoolModeRepository],
})
export class SchoolModeModule {}
