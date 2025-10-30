import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ViolationTypeService } from './violation-type.service';
import {
  CreateViolationTypeBatchDto,
  CreateViolationTypeDto,
} from './dto/create-violation-type.dto';
import { UpdateViolationTypeDto } from './dto/update-violation-type.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { QueryViolationTypeDto } from './dto/query-violation-type.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';

@Controller('violation-type')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ViolationTypeController {
  constructor(private readonly violationTypeService: ViolationTypeService) {}

  @Post('create')
  @SetRole(RoleEnum.ADMIN)
  create(
    @Body() createViolationTypeDto: CreateViolationTypeDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.violationTypeService.create(
      +payload.sub,
      createViolationTypeDto,
      Number(payload.school_id),
    );
  }

  @Post('create-batch')
  @SetRole(RoleEnum.ADMIN)
  createBatch(
    @Body() createViolationTypeDto: CreateViolationTypeBatchDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.violationTypeService.createBatch(
      +payload.sub,
      createViolationTypeDto,
      Number(payload.school_id),
    );
  }

  @Get('list')
  findAll(
    @Query() query: QueryViolationTypeDto,
    @Query() pageOptionsDto: PageOptionsDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.violationTypeService.findAll(
      query,
      pageOptionsDto,
      Number(payload.school_id),
    );
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.violationTypeService.findOne(+id, Number(payload.school_id));
  }

  @Patch('update/:id')
  @SetRole(RoleEnum.ADMIN)
  update(
    @Payload() payload: JwtPayload,
    @Param('id') id: string,
    @Body() updateViolationTypeDto: UpdateViolationTypeDto,
  ) {
    return this.violationTypeService.update(
      +id,
      updateViolationTypeDto,
      +payload.sub,
      Number(payload.school_id),
    );
  }

  @Delete('delete/:id')
  @SetRole(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.violationTypeService.remove(
      +id,
      +payload.sub,
      Number(payload.school_id),
    );
  }
}
