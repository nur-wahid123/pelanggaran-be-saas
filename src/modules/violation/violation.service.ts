import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateViolationDto } from './dto/create-violation.dto';
import { ViolationRepository } from 'src/repositories/violation.repository';
import { UserEntity } from 'src/entities/user.entity';
import { StudentEntity } from 'src/entities/student.entity';
import { In } from 'typeorm';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { QueryViolationDto } from './dto/query-violation.dto';
import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../redis/redis.service';
import { ViolationEntity } from 'src/entities/violation.entity';
import { LogTypeEnum } from 'src/commons/enums/log-type.enum';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ViolationService {
  async removeAll(userId: number) {
    const res = await this.violationRepository.removeAll();
    this.loggerService.crateLog({
      type: LogTypeEnum.DELETE_VIOLATION,
      userId,
      message: 'Violation Delete All',
    });
    this.redis.updateRedis(this.cacheVersionName);
    return res;
  }

  async remove(id: number, userId: number, schoolId: number) {
    const violation = await this.violationRepository.findOne({
      where: { id, school: { id: schoolId } },
      select: {
        id: true,
        deletedBy: true,
        deletedAt: true,
        students: {
          id: true,
        },
        violationTypes: {
          id: true,
        },
      },
    });
    if (!violation) {
      throw new NotFoundException('violation not found');
    }
    violation.deletedBy = userId;
    violation.deletedAt = new Date();
    this.redis.del(`violation:findone:${JSON.stringify({ id, schoolId })}`);
    this.redis.updateRedis(this.cacheVersionName);
    this.updateCorrelatedClass(
      violation.students,
      violation.violationTypes,
      schoolId,
    );
    this.loggerService.crateLog({
      type: LogTypeEnum.DELETE_VIOLATION,
      userId,
      metadata: { violation },
      message: 'Violation Delete',
    });
    return this.violationRepository.saveViolation(violation);
  }

  private updateCorrelatedClass(
    students: StudentEntity[],
    violationTypes: ViolationEntity[],
    schoolId: number,
  ) {
    for (let index = 0; index < students.length; index++) {
      const studentId = students[index].id;
      this.redis.del(
        `students:findone:${JSON.stringify({ id: studentId, schoolId })}`,
      );
    }
    for (let index = 0; index < violationTypes.length; index++) {
      const violationTypeIds = violationTypes[index].id;
      this.redis.del(
        `violation-type:findone:${JSON.stringify({ id: violationTypeIds, schoolId })}`,
      );
    }
    this.redis.updateRedis(this.cacheVersionNameStudent);
    this.redis.updateRedis(this.cacheNameVersionViolationType);
  }

  /**
   * Finds a single violation by id
   * @param id the violation id to find
   * @throws {NotFoundException} if no violation is found
   * @returns the found violation
   */
  async findOne(id: number, schoolId: number) {
    const cacheKey = `violation:findone:${JSON.stringify({ id, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = await this.violationRepository.findOne({
          where: { id, school: { id: schoolId } },
          relations: {
            violationTypes: true,
            image: true,
            students: true,
            creator: true,
          },
          select: {
            id: true,
            date: true,
            createdAt: true,
            creator: {
              id: true,
              name: true,
            },
            students: {
              id: true,
              name: true,
              nationalStudentId: true,
            },
            violationTypes: {
              id: true,
              point: true,
              name: true,
            },
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

  async findAll(
    query: QueryViolationDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
    schoolId: number,
  ) {
    const version = await this.redis.getVersion(this.cacheVersionName);
    const cacheKey = `violation:findall:v${version}:${JSON.stringify({ query, pageOptionsDto, dateRange, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const [data, itemCount] = await this.violationRepository.findAll(
          query,
          pageOptionsDto,
          dateRange,
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

  constructor(
    private readonly violationRepository: ViolationRepository,
    private readonly redis: RedisService,
    private readonly loggerService: LoggerService,
  ) {}

  private readonly cacheVersionName = 'violation:version';
  private readonly cacheNameVersionViolationType = `violation-type:version`;
  private readonly cacheVersionNameStudent = 'student:version';

  async createViolation(
    userId: number,
    body: CreateViolationDto,
    schoolId: number,
  ) {
    const { note, studentIds, violationTypeIds } = body;
    const user = await this.violationRepository.manager.findOne(UserEntity, {
      where: { id: userId, school: { id: schoolId } },
    });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    const students = await this.violationRepository.manager.findBy(
      StudentEntity,
      { id: In(studentIds), school: { id: schoolId } },
    );
    if (students.length === 0) {
      throw new NotFoundException('student not found');
    }
    const violationTypes = await this.violationRepository.findViolations(
      violationTypeIds,
      schoolId,
    );
    if (violationTypes.length === 0) {
      throw new NotFoundException('student not found');
    }
    this.redis.updateRedis(this.cacheVersionName);
    this.updateCorrelatedClass(students, violationTypes, schoolId);
    this.loggerService.crateLog({
      type: LogTypeEnum.CREATE_VIOLATION_SUCCESS,
      userId,
      metadata: { body },
      message: 'Violation Create',
    });
    const data = await this.violationRepository.createViolation(
      students,
      violationTypes,
      body.imageId,
      user,
      note,
      schoolId,
    );

    return data.id;
  }
}
