import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { Order } from 'src/commons/enums/order.enum';
import HashPassword from 'src/commons/utils/hash-password.util';
import { LoggerEntity } from 'src/entities/logger.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { UserEntity } from 'src/entities/user.entity';
import { UserLoginDto } from 'src/modules/auth/dto/login-user.dto';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { DataSource, Repository } from 'typeorm';
import { UserViewDto } from 'src/modules/user/dto/user-view.dto';

@Injectable()
export class UserRepository extends Repository<UserEntity> {
  async findAll(pageOptionsDto: PageOptionsDto, filter: FilterDto, schoolId: number) {
    const { page, skip, take, order } = pageOptionsDto;
    const qB = this.createQueryBuilder('user')
      .leftJoin('user.violations', 'violations')
      .leftJoin('user.school', 'school')
      .select(['user.id u_id', 'user.name u_name', 'user.role u_role'])
      .addSelect(['count(violations.id) total_violation'])
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
      .groupBy('user.id')
      .orderBy('total_violation', Order.DESC);
    if (page && take) {
      qB.offset(skip).limit(take);
    }
    const res = await qB.getRawMany<{ u_id: number, u_name: string, u_role: RoleEnum, total_violation: number }>()
    const count = await qB.getCount()
    const usr = res.map((us) => {
      const nw = new UserViewDto()
      nw.id = us.u_id
      nw.name = us.u_name
      nw.role = us.u_role
      nw.totalViolation = us.total_violation
      return nw
    })
    return { res: usr, count };
  }

  getLogs(userId: number, pageOptionsDto: PageOptionsDto) {
    const qb = this.datasource
      .createQueryBuilder(LoggerEntity, 'logger')
      .leftJoin('logger.user', 'user')
      .select(['logger.id', 'logger.message', 'logger.date'])
      .where((qB) => {
        qB.andWhere('user.id = :userId', { userId });
      });
    const { skip, page, take } = pageOptionsDto;
    if (page && take) {
      qb.skip(skip).take(take);
    }
    qb.orderBy('logger.id', Order.DESC);
    return qb.getManyAndCount();
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

  async findUserByUsername(username: string, slug?: string) {
    const whereCondition = slug
      ? { username, school: { slug } }
      : { username, role: RoleEnum.SUPERADMIN };

    const user = await this.findOne({
      where: whereCondition,
      relations: { school: true },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        password: true,
        school: {
          id: true,
          isDemo: true,
          startDate: true,
          isActive: true,
          image: true,
          slug: true,
        },
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
      userLoginDto.slug
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
