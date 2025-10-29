import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { UserUpdateDto } from './dto/user-update.dto';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { UserCreateDto } from './dto/user-create.dto';
import { PermissionGuard } from 'src/commons/guards/permission.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('list')
  @SetRole(RoleEnum.ADMIN)
  findAll(
    @Query() pageOptionsDto: PageOptionsDto,
    @Query() filter: FilterDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.userService.findAll(
      pageOptionsDto,
      filter,
      Number(payload.school_id),
    );
  }

  @Get('detail/:id')
  @SetRole(RoleEnum.ADMIN)
  findOne(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.userService.findOne(+id, Number(payload.school_id));
  }

  @Patch('edit/:id')
  @SetRole(RoleEnum.ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: UserUpdateDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.userService.update(+id, body, +payload.sub, payload.school_id);
  }

  @Post('create')
  @SetRole(RoleEnum.ADMIN)
  create(@Body() body: UserCreateDto, @Payload() payload: JwtPayload) {
    return this.userService.create(
      body,
      +payload.sub,
      Number(payload.school_id),
    );
  }

  @Delete('remove/:id')
  @SetRole(RoleEnum.ADMIN)
  remove(@Param('id') id: string, @Payload() payload: JwtPayload) {
    return this.userService.remove(+id, payload.sub, Number(payload.school_id));
  }
}
