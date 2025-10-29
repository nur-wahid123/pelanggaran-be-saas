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
import { SchoolService } from './school.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { SetRole } from '../../commons/decorators/role.decorator';
import { RoleEnum } from '../../commons/enums/role.enum';
import { Payload } from '../../commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { AdminUpdateSchoolDto } from './dto/admin-update-school.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';

@UseGuards(PermissionGuard)
@Controller('school')
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  @Post('create')
  @SetRole(RoleEnum.SUPERADMIN)
  create(
    @Body() createSchoolDto: CreateSchoolDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.schoolService.create(createSchoolDto, payload);
  }

  // @Get('isdemo')
  // isDemo(@Payload() payload: JwtPayload) {
  //   try {
  //     if (typeof payload.is_demo === 'undefined') {
  //       throw new Error('is_demo property not found in payload');
  //     }
  //     const isDemo = payload.is_demo;
  //     return isDemo;
  //   } catch (error) {
  //     // Log the error for debugging
  //     console.error('Error in isDemo:', error);
  //     // Return a more descriptive error to the client
  //     return {
  //       statusCode: 500,
  //       message: 'Failed to determine demo status',
  //       error: error.message || 'Internal server error',
  //     };
  //   }
  // }

  @Get('list')
  @SetRole(RoleEnum.SUPERADMIN)
  findAll(
    @Query() filter: SchoolFilterDto,
    @Query() pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
  ) {
    return this.schoolService.findAll(filter, pageOptionsDto, dateRange);
  }

  @Get('detail-admin/:id')
  @SetRole(RoleEnum.ADMIN)
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.schoolService.findOne(+id, Number(payload.school_id));
  }

  @Get('detail/:id')
  findOneSuper(@Param('id') id: string) {
    return this.schoolService.findOneSuper(+id);
  }

  @Patch('update/:id')
  @SetRole(RoleEnum.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Payload() payload: JwtPayload,
    @Body() updateSchoolDto: UpdateSchoolDto,
  ) {
    return this.schoolService.update(+id, updateSchoolDto, Number(payload.sub));
  }

  @Patch('admin/update/:id')
  @SetRole(RoleEnum.SUPERADMIN, RoleEnum.ADMIN)
  updateAdmin(
    @Param('id') id: string,
    @Payload() payload: JwtPayload,
    @Body() updateSchoolDto: AdminUpdateSchoolDto,
  ) {
    return this.schoolService.updateAdmin(
      +id,
      updateSchoolDto,
      Number(payload.sub),
    );
  }

  @Delete('remove/:id')
  @SetRole(RoleEnum.SUPERADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.schoolService.remove(+id, Number(payload.sub));
  }
}
