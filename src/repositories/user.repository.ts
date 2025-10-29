import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import HashPassword from 'src/commons/utils/hash-password.util';
import { SchoolEntity } from 'src/entities/school.entity';
import { UserEntity } from 'src/entities/user.entity';
import { UserLoginDto } from 'src/modules/auth/dto/login-user.dto';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  findAll(pageOptionsDto: PageOptionsDto, filter: FilterDto, schoolId: number) {
    const { page, skip, take, order } = pageOptionsDto;
    const qB = this.createQueryBuilder('user')
      .leftJoin('user.violations', 'violations')
      .leftJoin('user.school', 'school')
      .select(['user.id', 'user.name', 'user.role'])
      .addSelect(['violations.id'])
      .where((qb) => {
        const { search } = filter;
        qb.andWhere('school.id = :schoolId', { schoolId });
        if (search) {
          qb.andWhere(
            '(lower(user.username) LIKE lower(:search) OR lower(user.name) LIKE lower(:search))',
            {
              search: `%${search}%`,
            },
          );
        }
      })
      .orderBy('user.id', order);
    if (page && take) {
      qB.skip(skip).take(take);
    }
    return qB.getManyAndCount();
  }

  async saveSuper(newUser: UserEntity): Promise<UserEntity> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(newUser);
      await queryRunner.commitTransaction();
      return newUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  async saveUser(newUser: UserEntity): Promise<UserEntity> {
    const queryRunner = this.datasource.createQueryRunner()
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(newUser);
      await queryRunner.commitTransaction();
      return newUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  async saveUserCreate(
    newUser: UserEntity,
    schoolId: number,
  ): Promise<UserEntity> {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { isDemo: true, id: true, userLimit: true },
      });
      const userLength = await queryRunner.manager.count(UserEntity, {
        where: { school: { id: schoolId } },
      });
      if (school.isDemo && userLength >= school.userLimit) {
        throw new BadRequestException('Aplikasi Demo Tidak Diperbolehkan');
      }
      await queryRunner.manager.save(newUser);
      await queryRunner.commitTransaction();
      return newUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  generatePassword(password: string): string | PromiseLike<string> {
    return this.hashPassword.generate(password);
  }

  async checkUsernameAndEmailExistanceOnDB(username: string, email: string) {
    const user = await this.createQueryBuilder('user')
      .where('user.username = :username', { username })
      .orWhere('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
    if (user) {
      throw new ForbiddenException('User already exist');
    }
  }

  constructor(
    private readonly datasource: DataSource,
    private readonly hashPassword: HashPassword,
  ) {
    super(UserEntity, datasource.createEntityManager());
  }

  findUserByUsername(username: string) {
    const user = this.findOne({
      where: { username },
      relations: { school: true },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        password: true,
        school: { id: true, isDemo: true, startDate: true, isActive: true, image: true },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  isPasswordMatch(password: string, hashedPassword: string) {
    return this.hashPassword.compare(password, hashedPassword);
  }

  async validateUser(
    userLoginDto: UserLoginDto,
    isImpersonate?: boolean,
  ): Promise<UserEntity> {
    const user: UserEntity = await this.findUserByUsername(
      userLoginDto.username,
    );

    if (isImpersonate == true) {
      return user;
    }

    if (
      user &&
      (await this.hashPassword.compare(userLoginDto.password, user.password))
    ) {
      const result = user;
      delete result.password;
      return result;
    }
    throw new ForbiddenException('Username Or Password are incorrect');
  }
}
