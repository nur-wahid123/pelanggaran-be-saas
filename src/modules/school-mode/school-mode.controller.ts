import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SchoolModeService } from './school-mode.service';
import { CreateSchoolModeDto } from './dto/create-school-mode.dto';
import { UpdateSchoolModeDto } from './dto/update-school-mode.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';

@Controller('school-modes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SchoolModeController {
  constructor(private readonly schoolModeService: SchoolModeService) {}

  @Get('list')
  @SetRole(RoleEnum.SUPERADMIN, RoleEnum.ADMIN)
  findAll() {
    return this.schoolModeService.findAll();
  }

  @Get('detail/:id')
  @SetRole(RoleEnum.SUPERADMIN, RoleEnum.ADMIN)
  findOne(@Param('id') id: string) {
    return this.schoolModeService.findOne(+id);
  }

  @Post('create')
  @SetRole(RoleEnum.SUPERADMIN)
  create(
    @Body() dto: CreateSchoolModeDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.schoolModeService.create(dto, +payload.sub);
  }

  @Patch('update/:id')
  @SetRole(RoleEnum.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolModeDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.schoolModeService.update(+id, dto, +payload.sub);
  }

  @Delete('delete/:id')
  @SetRole(RoleEnum.SUPERADMIN)
  remove(@Param('id') id: string) {
    return this.schoolModeService.remove(+id);
  }
}
