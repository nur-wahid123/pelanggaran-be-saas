import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Token } from 'src/commons/types/token.type';
import { UserLoginDto } from './dto/login-user.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/commons/guards/permission.guard';
import { Request as ExRequest } from 'express';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from './jwt-payload.interface';
import { EditProfileDto } from './dto/edit-profile.dto';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() req: UserLoginDto): Promise<Token> {
    return this.authService.login(req);
  }

  @Patch('edit')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async edit(@Body() body: EditProfileDto, @Payload() payload: JwtPayload) {
    return this.authService.editProfile(body, +payload.sub);
  }

  @Patch('edit-password')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async editPassword(
    @Body() body: ResetPasswordDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.authService.editPassword(
      body,
      +payload.sub,
      Number(payload.school_id),
    );
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Request() req: ExRequest) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Post('impersonate-login/:id')
  @HttpCode(HttpStatus.OK)
  @SetRole(RoleEnum.SUPERADMIN)
  async impersonate(@Param('id') id: string) {
    return this.authService.impersonateUser(id);
  }

  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async profile(@Payload() payload: JwtPayload) {
    return this.authService.getUser(payload);
  }
}
