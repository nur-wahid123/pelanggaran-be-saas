import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('logger')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LoggerController {
  constructor(private readonly loggerService: LoggerService) {}

  @Post('set-export-violation-data')
  @SetRole(RoleEnum.ADMIN)
  setExportViolation(@Payload() payload: JwtPayload) {
    const userId = Number(payload.sub);
    this.loggerService.setExportViolation(userId);
  }

  @Get('get-export-violation-data')
  @SetRole(RoleEnum.ADMIN)
  getExportViolation() {
    return this.loggerService.getExportViolation();
  }
}
