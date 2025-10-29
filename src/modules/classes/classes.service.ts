import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassRepository } from 'src/repositories/classes.repository';
import { ClassEntity } from 'src/entities/class.entity';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { SchoolEntity } from 'src/entities/school.entity';
import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../redis/redis.service';
import { StudentEntity } from 'src/entities/student.entity';

@Injectable()
export class ClassesService {
  private readonly cacheVersionName = 'class:version';
  private readonly versionKey = 'student:version';

  updateCorrelationClass(studentIds: number[], schoolId: number) {
    this.redis.updateRedis(this.versionKey);
    for (let index = 0; index < studentIds.length; index++) {
      const studentId = studentIds[index];
      this.redis.del(
        `students:findone:${JSON.stringify({ id: studentId, schoolId })}`,
      );
    }
  }

  async findAll(
    school_id: number,
    query: FilterDto,
    pageOptionsDto: PageOptionsDto,
  ) {
    const version = await this.redis.getVersion(this.cacheVersionName);
    const cacheKey = `class:findall:${version}:${JSON.stringify({ school_id, query, pageOptionsDto })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const [data, itemCount] = await this.classRepository.findAll(
          school_id,
          query,
          pageOptionsDto,
        );
        const meta = new PageMetaDto({ pageOptionsDto, itemCount });
        const pagedto = new PageDto(data, meta);
        const transformed = instanceToPlain(pagedto);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        console.log(error);
        throw new InternalServerErrorException('internal server error');
      }
    }
  }

  async create(
    userId: number,
    schoolId: number,
    createClassDto: CreateClassDto,
  ) {
    const { name } = createClassDto;
    const classes = await this.classRepository.findOne({
      where: { name, school: { id: schoolId } },
    });
    if (classes) {
      throw new BadRequestException(['the class already exists']);
    }
    const newClass = new ClassEntity();
    const school = new SchoolEntity();
    school.id = schoolId;
    newClass.school = school;
    newClass.name = name;
    newClass.createdBy = userId;
    await this.classRepository.saveClassCreate(newClass, schoolId);
    this.redis.updateRedis(this.cacheVersionName);
    this.redis.updateRedis(this.versionKey);
    return 'This action adds a new class';
  }

  constructor(
    private readonly classRepository: ClassRepository,
    private readonly redis: RedisService,
  ) {}

  async findOne(id: number, school_id: number) {
    const cacheKey = `class:findone:${JSON.stringify({ id, school_id })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return cache;
    } else {
      try {
        const data = await this.classRepository.findOne({
          where: { id, school: { id: school_id } },
          relations: { students: true },
          select: {
            id: true,
            name: true,
            students: {
              id: true,
            },
          },
        });
        if (!data) {
          throw new NotFoundException('class not found');
        }
        const transformed = instanceToPlain(data);
        this.redis.set(cacheKey, transformed);
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }

  async update(
    id: number,
    updateClassDto: UpdateClassDto,
    userId: number,
    school_id: number,
  ) {
    const { name } = updateClassDto;
    const data = await this.findOne(id, school_id);
    const newDt = new ClassEntity();
    newDt.id = id;
    newDt.name = name;
    newDt.updatedBy = userId;
    this.updateCorrelationClass(
      data.students.map((dt: StudentEntity) => {
        return dt.id;
      }),
      school_id,
    );
    this.redis.del(`class:findone:${JSON.stringify({ id, school_id })}`);
    this.redis.updateRedis(this.cacheVersionName);
    return this.classRepository.saveClass(newDt);
  }

  async remove(id: number, userId: number, school_id: number) {
    const data = await this.findOne(id, school_id);
    if (!data) {
      throw new NotFoundException('class not found');
    }
    if (data.students.length > 0) {
      throw new BadRequestException('this class has students');
    }
    const newDt = new ClassEntity();
    newDt.id = id;
    newDt.deletedAt = new Date();
    newDt.deletedBy = userId;
    this.updateCorrelationClass(
      data.students.map((dt: StudentEntity) => {
        return dt.id;
      }),
      school_id,
    );
    this.redis.del(`class:findone:${JSON.stringify({ id, school_id })}`);
    this.redis.updateRedis(this.cacheVersionName);
    return this.classRepository.saveClass(newDt);
  }
}
