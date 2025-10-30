import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { UserRepository } from 'src/repositories/user.repository';
import { UserUpdateDto } from './dto/user-update.dto';
import { UserCreateDto } from './dto/user-create.dto';
import { UserEntity } from 'src/entities/user.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class UserService {
  updateCorrelateClass(violationIds: number[], schoolId: number) {
    for (let index = 0; index < violationIds.length; index++) {
      const violationId = violationIds[index];
      this.redis.del(
        `violation:findone:${JSON.stringify({ id: violationId, schoolId })}`,
      );
    }
    this.redis.updateRedis(this.cacheVersionNameViolation);
    this.redis.del(`school:findone:${schoolId}`);
    this.redis.del(`school:findoneSuper:${schoolId}`);
  }

  async getLogs(userId: number, pageOptionsDto: PageOptionsDto) {
    const [data, itemCount] = await this.userRepository.getLogs(
      userId,
      pageOptionsDto,
    );
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async remove(id: number, userId: number, schoolId: number) {
    const user: UserEntity = await this.userRepository.findOne({
      where: { id, school: { id: schoolId } },
      relations: { violations: true, school: true },
      select: {
        violations: { id: true },
        id: true,
        role: true,
        school: { id: true },
      },
    });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    if (user.violations.length > 0) {
      throw new BadRequestException('this user already notes violations');
    }
    user.id = id;
    user.deletedBy = userId;
    user.deletedAt = new Date();
    try {
      const cacheKey = `user:findone:${id}`;
      this.updateCorrelateClass(
        user.violations.map((v) => {
          return v.id;
        }),
        schoolId,
      );
      this.redis.updateRedis(this.cacheVersionName);
      this.redis.del(cacheKey);
      return this.userRepository.saveUser(user);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('internal server error');
    }
  }

  async create(userCreateDto: UserCreateDto, userId: number, schoolId: number) {
    try {
      await this.userRepository.checkUsernameAndEmailExistanceOnDB(
        userCreateDto.username,
        userCreateDto.email,
      );
    } catch (error) {
      console.log(error);
      throw new ForbiddenException('User already exist');
    }
    const userWithThisEmail: UserEntity = await this.userRepository.findOne({
      where: { email: userCreateDto.email, school: { id: schoolId } },
      withDeleted: true,
    });
    let user: UserEntity = new UserEntity();
    if (userWithThisEmail) {
      user = userWithThisEmail;
      user.deletedAt = null;
      user.deletedBy = null;
    }
    user.name = userCreateDto.name;
    user.username = userCreateDto.username;
    user.role = userCreateDto.role;
    user.email = userCreateDto.email;
    const password = userCreateDto.password;
    const hashedPassword = await this.userRepository.generatePassword(password);
    user.password = hashedPassword;
    user.createdBy = userId;
    user.school = { id: schoolId } as SchoolEntity;
    this.redis.updateRedis(this.cacheVersionName);
    return this.userRepository.saveUserCreate(user, schoolId);
  }

  async update(
    id: number,
    userUpdateDto: UserUpdateDto,
    userId: number,
    schoolId: number,
  ) {
    const user: UserEntity = await this.findOne(id, schoolId);
    if (!user) {
      throw new NotFoundException('user not found');
    }
    const userWithThisName: UserEntity[] = await this.userRepository.find({
      where: { username: userUpdateDto.username, school: { id: schoolId } },
    });
    const userWithThisEmail: UserEntity[] = await this.userRepository.find({
      where: { email: userUpdateDto.email, school: { id: schoolId } },
    });
    if (userWithThisEmail.length > 1 || userWithThisName.length > 1) {
      throw new BadRequestException(
        'User with This Name or Email already exist',
      );
    }
    user.name = userUpdateDto.name;
    user.username = userUpdateDto.username;
    user.role = userUpdateDto.role;
    user.email = userUpdateDto.email;
    user.updatedBy = userId;
    this.updateCorrelateClass(
      user.violations.map((v) => {
        return v.id;
      }),
      schoolId,
    );
    this.redis.updateRedis(this.cacheVersionName);
    const cacheKey = `user:findone:${id}`;
    this.redis.del(cacheKey);
    return this.userRepository.saveUser(user);
  }

  async findOne(id: number, schoolId: number) {
    const cacheKey = `user:findone:${id}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = await this.userRepository.findOne({
          where: { id, school: { id: schoolId } },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            violations: {
              id: true,
            },
            role: true,
          },
        });
        if (!data) throw new NotFoundException('data tidak ditemukan');
        const transformed = instanceToPlain(data);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }

  constructor(
    private readonly userRepository: UserRepository,
    private readonly redis: RedisService,
  ) {}

  private readonly cacheVersionName = 'user:version';
  private readonly cacheVersionNameViolation = 'violation:version';

  async findAll(
    pageOptionsDto: PageOptionsDto,
    filter: FilterDto,
    schoolId: number,
  ) {
    const version = await this.redis.getVersion(this.cacheVersionName);
    const cacheKey = `user:findall:v${version}:${JSON.stringify({ pageOptionsDto, filter, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const [data, itemCount] = await this.userRepository.findAll(
          pageOptionsDto,
          filter,
          schoolId,
        );
        const meta = new PageMetaDto({ pageOptionsDto, itemCount });

        const pageDto = new PageDto(data, meta);
        const transformed = instanceToPlain(pageDto);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }
}
