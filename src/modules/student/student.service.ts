import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateStudentBatchDto,
  CreateStudentDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentEntity } from 'src/entities/student.entity';
import { StudentRepository } from 'src/repositories/student.repository';
import { ClassEntity } from 'src/entities/class.entity';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { SchoolEntity } from '../../entities/school.entity';
import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StudentService {
  private readonly cacheVersionName = 'student:version';

  async findAll(
    query: FilterDto,
    pageOptionsDto: PageOptionsDto,
    schoolId: number,
  ) {
    const version = await this.redis.getVersion(this.cacheVersionName);
    const cacheKey = `student:findall:${version}:${JSON.stringify({ query, pageOptionsDto, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const [data, itemCount] = await this.studentRepository.findAllStudent(
          query,
          pageOptionsDto,
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

  async findAllSearch(query: FilterDto, pageOptionsDto: PageOptionsDto) {
    const [data, itemCount] = await this.studentRepository.findAllStudentSearch(
      query,
      pageOptionsDto,
    );

    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async createBatch(
    userId: number,
    createStudentDto: CreateStudentBatchDto,
    schoolId: number,
  ) {
    this.redis.updateRedis(this.cacheVersionName);
    return this.studentRepository.saveStudents(
      userId,
      createStudentDto,
      schoolId,
    );
  }

  constructor(
    private readonly studentRepository: StudentRepository,
    private readonly redis: RedisService,
  ) {}

  async create(
    userId: number,
    createStudentDto: CreateStudentDto,
    schoolId: number,
  ) {
    const { className, name, nis, nisn } = createStudentDto;
    let student: StudentEntity = await this.studentRepository.findOne({
      where: { nationalStudentId: nisn, school: { id: schoolId } },
    });
    if (!student) {
      student = new StudentEntity();
    }
    const classEntity = await this.studentRepository.manager.findOne(
      ClassEntity,
      { where: { name: className, school: { id: schoolId } } },
    );
    if (!classEntity) {
      throw new NotFoundException('class not found');
    }
    student.studentClass = classEntity;
    student.createdBy = userId;
    student.name = name;
    student.nationalStudentId = nisn;
    const school = new SchoolEntity();
    school.id = schoolId;
    student.school = school;
    student.schoolStudentId = nis;
    this.redis.updateRedis(this.cacheVersionName);
    await this.studentRepository.saveStudent(student, schoolId);
    return student;
  }

  async findOne(id: string, schoolId: number) {
    const cacheKey = `students:findone:${JSON.stringify({ id, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = await this.studentRepository.findOne({
          where: { nationalStudentId: id, school: { id: schoolId } },
          relations: { studentClass: true, violations: { violationTypes: true } },
          select: {
            id: true,
            name: true,
            studentClass: {
              id: true,
              name: true,
            },
            nationalStudentId: true,
            schoolStudentId: true,
            violations: {
              id: true,
              violationTypes: {
                id: true,
                point: true
              }
            }
          }
        });
        if (!data) {
          throw new NotFoundException('student not found');
        }
        const transformed = instanceToPlain(data);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }

  updateCorrelateClass(
    violationIds: number[],
    classId: number,
    schoolId: number,
  ) {
    for (let index = 0; index < violationIds.length; index++) {
      const violationId = violationIds[index];
      this.redis.del(
        `violation:findone:${JSON.stringify({ id: violationId, schoolId })}`,
      );
    }
    this.redis.del(
      `class:findone:${JSON.stringify({ id: classId, school_id: schoolId })}`,
    );
    this.redis.updateRedis(this.cacheVersionNameClass);
    this.redis.updateRedis(this.cacheVersionNameViolation);
  }

  private readonly cacheVersionNameClass = 'class:version';
  private readonly cacheVersionNameViolation = 'violation:version';

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
    schoolId: number,
  ) {
    const student = await this.studentRepository.findOne({
      where: { nationalStudentId: String(id), school: { id: schoolId } },
      relations: { studentClass: true },
    });
    if (!student) {
      throw new NotFoundException('student not found');
    }

    if (updateStudentDto.name !== undefined) {
      student.name = updateStudentDto.name;
    }
    if (updateStudentDto.nis !== undefined) {
      student.schoolStudentId = updateStudentDto.nis;
    }
    if (updateStudentDto.nisn !== undefined) {
      student.nationalStudentId = updateStudentDto.nisn;
    }
    if (updateStudentDto.className !== undefined) {
      const classEntity = await this.studentRepository.manager.findOne(
        ClassEntity,
        {
          where: { name: updateStudentDto.className, school: { id: schoolId } },
        },
      );
      if (!classEntity) {
        throw new NotFoundException('class not found');
      }
      student.studentClass = classEntity;
    }

    this.updateCorrelateClass(
      student.violations.map((d) => {
        return d.id;
      }),
      student.studentClass.id,
      schoolId
    );
    this.redis.del(`students:findone:${JSON.stringify({ id, schoolId })}`);
    this.redis.updateRedis(this.cacheVersionName);

    await this.studentRepository.saveStudent(student, schoolId);
    return student;
  }

  async remove(id: string, userId: number, schoolId: number) {
    const data = await this.studentRepository.findOne({
      where: { nationalStudentId: id, school: { id: schoolId } },
      relations: { studentClass: true, violations: true },
      select: {
        id: true,
        deletedBy: true,
        deletedAt: true,
        violations: { id: true },
        studentClass: {
          id: true,
        }
      },
    });
    if (!data) {
      throw new NotFoundException('student not found');
    }
    // Prevent deletion if student has violations
    if (data.violations && data.violations.length > 0) {
      throw new BadRequestException(
        'this student has violations and cannot be deleted',
      );
    }
    data.deletedAt = new Date();
    data.deletedBy = userId;

    this.updateCorrelateClass(
      data.violations.map((d) => {
        return d.id;
      }),
      data.studentClass.id,
      schoolId
    );
    this.redis.del(`students:findone:${JSON.stringify({ id, schoolId })}`);
    this.redis.updateRedis(this.cacheVersionName);
    return this.studentRepository.saveStudent(data, schoolId);
  }
}
