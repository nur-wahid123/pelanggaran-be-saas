import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from './dto/login-user.dto';
import { UserEntity } from 'src/entities/user.entity';
import { Token } from 'src/commons/types/token.type';
import { UserRepository } from 'src/repositories/user.repository';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './jwt-payload.interface';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { EditProfileDto } from './dto/edit-profile.dto';
import { LoggerService } from '../logger/logger.service';
import { LogTypeEnum } from 'src/commons/enums/log-type.enum';

@Injectable()
export class AuthService {
  async impersonateUser(id: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: +id },
        select: { id: true, username: true },
      });
      const payload = await this.userRepository.validateUser(
        { username: user.username, password: '' },
        true,
      );

      const token = await this.getToken(payload);
      return token;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async editProfile(body: EditProfileDto, userId: number) {
    // Check if username or email already exists (excluding current user)
    if (body.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: body.username },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Username already exists.');
      }
    }
    if (body.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: body.email },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email already exists.');
      }
    }

    // Update user profile
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true },
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    if (body.username) user.username = body.username;
    if (body.email) user.email = body.email;
    if (body.name) user.name = body.name;

    this.loggerService.crateLog({
      type: LogTypeEnum.EDIT_SELF,
      userId: user.id,
      metadata: { body },
      message: 'User Edit Profil',
    });
    return this.userRepository.saveUser(user);
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly loggerService: LoggerService,
  ) {}

  async editPassword(body: ResetPasswordDto, userId: number, schoolId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, school: { id: schoolId } },
      select: { id: true, password: true },
    });
    if (user) {
      const isMatch = await this.userRepository.isPasswordMatch(
        body.oldPassword,
        user.password,
      );
      if (!isMatch) {
        throw new BadRequestException('Old password is incorrect');
      }
      user.password = await this.userRepository.generatePassword(
        body.newPassword,
      );
      this.loggerService.crateLog({
        type: LogTypeEnum.EDIT_PASSWORD,
        userId: user.id,
        metadata: { body },
        message: 'User Edit Password',
      });
      return this.userRepository.saveUser(user);
    }
    throw new UnauthorizedException('Please login first.');
  }

  getUser(payload: JwtPayload) {
    if (payload.sub) {
      return this.userRepository.findOne({
        where: { id: payload.sub, school: { id: Number(payload.school_id) } },
        relations: { violations: true },
        select: {
          password: false,
          violations: { id: true },
          email: true,
          id: true,
          role: true,
          username: true,
          name: true,
        },
      });
    }
    throw new InternalServerErrorException('Internal server error.');
  }

  async init() {
    // Check if a superadmin user already exists
    const superadminExists = await this.userRepository.findOne({
      where: { role: RoleEnum.SUPERADMIN },
      select: { id: true },
    });

    if (superadminExists) {
      console.log('Superadmin user already exists.');
      return;
    }

    // Create the first superadmin user
    const superadminUser = new UserEntity();
    superadminUser.name = process.env.SUPERADMIN_NAME || 'Super Admin';
    superadminUser.username = process.env.SUPERADMIN_USERNAME || 'superadmin';
    superadminUser.email =
      process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
    superadminUser.role = RoleEnum.SUPERADMIN;
    const password = process.env.SUPERADMIN_PASSWORD || 'pranotocoro12';
    superadminUser.password =
      await this.userRepository.generatePassword(password);

    await this.userRepository.saveSuper(superadminUser);

    console.log('Superadmin user created successfully.');
  }

  async login(dto: UserLoginDto): Promise<Token> {
    const { username } = dto;
    try {
      const user = await this.userRepository.findUserByUsername(username);
      if (user.role !== RoleEnum.SUPERADMIN && !user.school.isActive) {
        throw new BadRequestException(
          'Sekolah Tidak Aktif Silahkan hubungi Admin 087743886185',
        );
      }
      const payload = await this.userRepository.validateUser(dto);

      const token = await this.getToken(payload);
      this.loggerService.crateLog({
        type: LogTypeEnum.LOGIN_ATTEMPT_SUCCESS,
        userId: payload.id,
        metadata: { payload, dto },
        message: 'User Login Successfully',
      });
      return token;
    } catch (error) {
      console.log(error);
      this.loggerService.crateLog({
        type: LogTypeEnum.LOGIN_ATTEMPT_FAILED,
        message: 'User Login Failed',
        metadata: { dto, error },
      });
      throw error;
    }
  }

  async getToken(user: UserEntity): Promise<Token> {
    const payload = {
      username: user.username,
      name: user.name,
      sub: user.id,
      email: user.email,
      role: user.role,
      school_id: user.role === RoleEnum.SUPERADMIN ? 0 : user.school.id,
      is_demo: user.role === RoleEnum.SUPERADMIN ? false : user.school.isDemo,
      start_date:
        user.role === RoleEnum.SUPERADMIN ? false : user.school.startDate,
      image: user.role === RoleEnum.SUPERADMIN ? false : user.school.image,
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: process.env.USER_KEY_SECRET,
      expiresIn: Number(process.env.EXPIRY_TOKEN_TIME) || '2h',
    });

    return { access_token: token, role: user.role };
  }
}
