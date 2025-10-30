import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ViolationService } from './violation.service';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateViolationDto } from './dto/create-violation.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { QueryViolationDto } from './dto/query-violation.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';

@Controller('violation')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ViolationController {
  constructor(private readonly violationService: ViolationService) {}

  @Post('create')
  createVioation(
    @Payload() payload: JwtPayload,
    @Body() body: CreateViolationDto,
  ) {
    return this.violationService.createViolation(
      +payload.sub,
      body,
      Number(payload.school_id),
    );
  }

  @Get('list')
  @SetRole(RoleEnum.ADMIN)
  findAll(
    @Payload() payload: JwtPayload,
    @Query() query: QueryViolationDto,
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() dateRange: QueryDateRangeDto,
  ) {
    return this.violationService.findAll(
      query,
      pageOptionsDto,
      dateRange,
      Number(payload.school_id),
    );
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.violationService.findOne(+id, Number(payload.school_id));
  }

  @Delete('delete/:id')
  @SetRole(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.violationService.remove(
      +id,
      +payload.sub,
      Number(payload.school_id),
    );
  }

  @Delete('delete/all/vil')
  @SetRole(RoleEnum.ADMIN)
  removeAll(@Payload() payload: JwtPayload) {
    return this.violationService.removeAll(+payload.sub);
  }
}
