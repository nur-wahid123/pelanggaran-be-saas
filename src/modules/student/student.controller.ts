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
import { StudentService } from './student.service';
import {
  CreateStudentBatchDto,
  CreateStudentDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
//TODO implement saas feature to this controller and all of it's dependant
@Controller('student')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post('create')
  @SetRole(RoleEnum.ADMIN, RoleEnum.SUPERADMIN)
  create(
    @Body() createStudentDto: CreateStudentDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.studentService.create(
      +payload.sub,
      createStudentDto,
      Number(payload.school_id),
    );
  }

  @Post('create-batch')
  @SetRole(RoleEnum.ADMIN, RoleEnum.SUPERADMIN)
  createBatch(
    @Body() createStudentDto: CreateStudentBatchDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.studentService.createBatch(
      +payload.sub,
      createStudentDto,
      Number(payload.school_id),
    );
  }

  @Get('list')
  findAll(
    @Query() query: FilterDto,
    @Query() pageOptionsDto: PageOptionsDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.studentService.findAll(
      query,
      pageOptionsDto,
      Number(payload.school_id),
    );
  }

  @Get('search-list')
  findAllSearch(
    @Query() query: FilterDto,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.studentService.findAllSearch(query, pageOptionsDto);
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.studentService.findOne(id, Number(payload.school_id));
  }

  @Patch('update/:id')
  @SetRole(RoleEnum.ADMIN, RoleEnum.SUPERADMIN)
  update(
    @Param('id') id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.studentService.update(
      +id,
      updateStudentDto,
      Number(payload.school_id),
    );
  }

  @Delete('delete/:id')
  @SetRole(RoleEnum.ADMIN, RoleEnum.SUPERADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.studentService.remove(
      id,
      +payload.sub,
      Number(payload.school_id),
    );
  }
}
