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
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';

@Controller('classes')
@UseGuards(JwtAuthGuard,PermissionGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  //TODO: add saas functionality
  @Post('create')
  @SetRole(RoleEnum.ADMIN)
  create(
    @Body() createClassDto: CreateClassDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.classesService.create(
      +payload.sub,
      Number(payload.school_id),
      createClassDto,
    );
  }
  
  @Get('list')
  findAll(
    @Query() query: FilterDto,
    @Payload() payload: JwtPayload,
    @Query() pageOptionsDto: PageOptionsDto,
  ) {
    return this.classesService.findAll(
      Number(payload.school_id),
      query,
      pageOptionsDto,
    );
  }
  
  @Get('detail/:id')
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.classesService.findOne(+id, Number(payload.school_id));
  }
  
  @Patch('update/:id')
  @SetRole(RoleEnum.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.classesService.update(
      +id,
      updateClassDto,
      +payload.sub,
      Number(payload.school_id),
    );
  }
  
  @Delete('delete/:id')
  @SetRole(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.classesService.remove(
      +id,
      +payload.sub,
      Number(payload.school_id),
    );
  }
}
