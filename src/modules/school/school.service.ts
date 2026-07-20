import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SchoolEntity } from 'src/entities/school.entity';
import { toYYYYMM } from 'src/commons/utils/date.util';
import { UserEntity } from 'src/entities/user.entity';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { SchoolRepository } from 'src/repositories/school.repository';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { SchoolFilterDto } from './dto/school-filter.dto';
import { UserRepository } from 'src/repositories/user.repository';
import { AdminUpdateSchoolDto } from './dto/admin-update-school.dto';
import { RedisService } from '../redis/redis.service';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class SchoolService {
  constructor(
    private readonly schoolRepository: SchoolRepository,
    private readonly userRepository: UserRepository,
    private readonly redis: RedisService,
  ) { }
  private readonly versionKey = 'school:version';

  async create(createSchoolDto: CreateSchoolDto, payload: JwtPayload) {
    // Destructure the incoming DTO
    const {
      address,
      classLimit,
      description,
      email,
      image,
      isActive,
      isDemo,
      phone,
      schoolName,
      schoolSlug,
      startDate,
      studentLimit,
      userEmail,
      userLimit,
      userName,
      userPassword,
      userUsername,
      violationLimit,
      violationTypeLimit,
    } = createSchoolDto;

    // Create and populate the SchoolEntity
    const school = new SchoolEntity();
    school.name = schoolName;
    school.slug = schoolSlug;
    school.isDemo = isDemo;
    school.isActive = isActive;
    school.address = address;
    school.phone = phone;
    school.description = description;
    school.email = email;
    school.image = image;
    school.startDate = toYYYYMM(startDate);
    school.studentsLimit = studentLimit;
    school.violationLimit = violationLimit;
    school.classesLimit = classLimit;
    school.userLimit = userLimit;
    school.violationTypeLimit = violationTypeLimit;
    school.createdBy = Number(payload.sub);

    const user = new UserEntity();
    user.username = userUsername;
    user.name = userName;
    user.email = userEmail;
    user.password = await this.userRepository.generatePassword(userPassword);
    user.role = RoleEnum.ADMIN; // or RoleEnum.ADMIN if you have an enum
    user.school = school;
    this.redis.updateRedis(this.versionKey);
    return this.schoolRepository.saveSchool(school, user);
  }

  async findAll(
    filter: SchoolFilterDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
  ) {
    const version = await this.redis.getVersion(this.versionKey);
    const cacheKey = `school:v${version}:findall:${JSON.stringify({ filter, pageOptionsDto, dateRange })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = await this.schoolRepository.findAll(
          filter,
          pageOptionsDto,
          dateRange,
        );
        const transformed = instanceToPlain(data);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (e) {
        throw e;
      }
    }
  }

  async findOne(id: number, school_id: number) {
    const cacheKey = `school:findone:${id}`;
    if (id !== school_id)
      throw new ForbiddenException('dilarang mengabil data ini');
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = this.schoolRepository.findOne({
          where: { id },
          relations: {},
          select: {
            id: true,
            name: true,
            address: true,
            image: true,
            startDate: true,
            studentsLimit: true,
            violationTypeLimit: true,
            violationLimit: true,
            classesLimit: true,
            userLimit: true,
          },
        });
        const transformed = instanceToPlain(data);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }

  async findOneBySlug(slug: string) {
    const data = await this.schoolRepository.findOne({
      where: { slug },
      select: {
        id: true,
        name: true,
        address: true,
        slug: true,
        image: true,
        isDemo: true,
        isActive: true,
      }
    });
    if (!data) throw new NotFoundException('Sekolah tidak ditemukan');
    return instanceToPlain(data);
  }

  async findOneSuper(id: number) {
    try {
      const cacheKey = `school:findoneSuper:${id}`;
      const cache = await this.redis.get(cacheKey);
      if (cache) {
        return cache;
      }
      const data = await this.schoolRepository.createQueryBuilder('school')
        .leftJoin('school.users', 'user')
        .select([
          'school.id',
          'school.name',
          'school.address',
          'school.image',
          'school.email',
          'school.phone',
          'school.description',
          'school.startDate',
          'school.studentsLimit',
          'school.violationTypeLimit',
          'school.violationLimit',
          'school.classesLimit',
          'school.isDemo',
          'school.isActive',
          'school.userLimit',
          'user.id',
          'user.name',
          'user.isActive',
          'user.email',
          'user.role'
        ])
        .loadRelationCountAndMap('school.class_count', 'school.classes')
        .loadRelationCountAndMap('school.students_count', 'school.students')
        .loadRelationCountAndMap('school.violation_types_count', 'school.violationTypes')
        .loadRelationCountAndMap('school.violations_count', 'school.violations')
        .where('school.id = :id', { id })
        .getOne();

      if (!data) {
        throw new NotFoundException('School not found');
      }

      const transformed = instanceToPlain(data);
      transformed.students = Array.from({ length: (data as any).studentsCount || 0 }, () => ({ id: 0 }));
      transformed.violation_types = Array.from({ length: (data as any).violationTypesCount || 0 }, () => ({ id: 0 }));
      transformed.violations = Array.from({ length: (data as any).violationsCount || 0 }, () => ({ id: 0 }));

      this.redis.set(cacheKey, transformed);
      return transformed;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async update(id: number, updateSchoolDto: UpdateSchoolDto, userId: number) {
    await this.schoolRepository.updateSchool(id, updateSchoolDto, userId);
    this.redis.del(`school:findone:${id}`);
    this.redis.del(`school:findoneSuper:${id}`);
    await this.redis.updateRedis(this.versionKey);
    return this.schoolRepository.findOne({ where: { id } });
  }

  async updateAdmin(
    id: number,
    updateSchoolDto: AdminUpdateSchoolDto,
    userId: number,
  ) {
    await this.schoolRepository.updateSchoolAdmin(id, updateSchoolDto, userId);
    this.redis.del(`school:findone:${id}`);
    this.redis.del(`school:findoneSuper:${id}`);
    await this.redis.updateRedis(this.versionKey);
    return this.schoolRepository.findOne({ where: { id } });
  }

  async remove(id: number, userId: number) {
    await this.schoolRepository.deleteSchool(id, userId);
    this.redis.del(`school:findone:${id}`);
    this.redis.del(`school:findoneSuper:${id}`);
    await this.redis.updateRedis(this.versionKey);
    return { deleted: true };
  }
}
