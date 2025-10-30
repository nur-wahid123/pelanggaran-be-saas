import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateViolationTypeBatchDto,
  CreateViolationTypeDto,
} from './dto/create-violation-type.dto';
import { UpdateViolationTypeDto } from './dto/update-violation-type.dto';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { ViolationTypeRepository } from 'src/repositories/violation-type.repository';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { QueryViolationTypeDto } from './dto/query-violation-type.dto';
import { SchoolEntity } from 'src/entities/school.entity';
import { instanceToPlain } from 'class-transformer';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../logger/logger.service';
import { LogTypeEnum } from 'src/commons/enums/log-type.enum';

@Injectable()
export class ViolationTypeService {
  createBatch(
    userId: number,
    createViolationTypeDto: CreateViolationTypeBatchDto,
    schoolId: number,
  ) {
    this.loggerService.crateLog({
      type: LogTypeEnum.IMPORT_VIOLATION_TYPE,
      userId,
      metadata: { createViolationTypeDto },
      message: 'Violation Type import',
    });
    this.redis.updateRedis(this.cacheNameVersion);
    return this.violationTypeRepository.saveViolations(
      userId,
      createViolationTypeDto,
      schoolId,
    );
  }

  async create(
    userId: number,
    createViolationTypeDto: CreateViolationTypeDto,
    schoolId: number,
  ) {
    const { name, point } = createViolationTypeDto;
    const exists = await this.violationTypeRepository.findOne({
      where: { name, school: { id: schoolId } },
    });
    if (exists) {
      throw new BadRequestException(['violation type already exists']);
    }
    const violationType = new ViolationTypeEntity();
    const school = new SchoolEntity();
    school.id = schoolId;
    violationType.school = school;
    violationType.name = name;
    violationType.createdBy = userId;
    violationType.point = point;
    await this.violationTypeRepository.saveViolationTypeCreate(
      violationType,
      schoolId,
    );
    this.loggerService.crateLog({
      type: LogTypeEnum.CREATE_VIOLATION_TYPE_SUCCESS,
      userId,
      metadata: { createViolationTypeDto },
      message: 'Violation Type Create',
    });
    this.redis.updateRedis(this.cacheNameVersion);
    return violationType;
  }

  constructor(
    private readonly violationTypeRepository: ViolationTypeRepository,
    private readonly redis: RedisService,
    private readonly loggerService: LoggerService,
  ) {}

  private readonly cacheNameVersion = `violation-type:version`;
  private readonly cacheVersionNameViolation = 'violation:version';

  async findAll(
    filter: QueryViolationTypeDto,
    pageOptionsDto: PageOptionsDto,
    schoolId: number,
  ) {
    const version = await this.redis.getVersion(this.cacheNameVersion);
    const cacheKey = `violation-type:findall:v${version}:${JSON.stringify({ filter, pageOptionsDto, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    } else {
      try {
        const [data, itemCount] = await this.violationTypeRepository.findAll(
          filter,
          pageOptionsDto,
          schoolId,
        );

        const meta = new PageMetaDto({ pageOptionsDto, itemCount });

        const pageDto = new PageDto(data, meta);
        const transformed = instanceToPlain(pageDto);
        this.redis.set(cacheKey, JSON.stringify(transformed));
        return transformed;
      } catch (error) {
        throw error;
      }
    }
  }

  async findOne(id: number, schoolId: number): Promise<ViolationTypeEntity> {
    const cacheKey = `violation-type:findone:${JSON.stringify({ id, schoolId })}`;
    const cache = await this.redis.get(cacheKey);
    if (cache) {
      return JSON.parse(cache);
    } else {
      try {
        const data = await this.violationTypeRepository.findOne({
          where: { id, school: { id: schoolId } },
          relations: { violations: { students: true } },
          select: {
            id: true,
            name: true,
            point: true,
            violations: {
              id: true,
              students: true,
            },
          },
        });
        if (!data) throw new NotFoundException('data tidak ditemukan');
        this.redis.set(cacheKey, JSON.stringify(data));
        return data;
      } catch (error) {
        throw error;
      }
    }
  }

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

  async update(
    id: number,
    updateViolationTypeDto: UpdateViolationTypeDto,
    userId: number,
    schoolId: number,
  ) {
    const violationType = await this.findOne(id, schoolId);
    violationType.id = id;
    violationType.updatedBy = userId;
    violationType.name = updateViolationTypeDto.name;
    violationType.point = updateViolationTypeDto.point;
    this.redis.del(
      `violation-type:findone:${JSON.stringify({ id, schoolId })}`,
    );
    this.redis.updateRedis(this.cacheNameVersion);
    this.updateCorrelateClass(
      violationType.violations.map((v) => {
        return v.id;
      }),
      schoolId,
    );
    await this.violationTypeRepository.saveViolationType(violationType);
    this.loggerService.crateLog({
      type: LogTypeEnum.UPDATE_VIOLATION_TYPE,
      userId,
      metadata: { updateViolationTypeDto, id },
      message: 'Violation Type Update',
    });
    return violationType;
  }

  async remove(id: number, userId: number, schoolId: number) {
    const violationType = await this.findOne(id, schoolId);
    if (!violationType) {
      throw new NotFoundException('violation type not found');
    }
    if (violationType.violations.length > 0) {
      throw new BadRequestException('this violation type has violations');
    }
    violationType.id = id;
    violationType.deletedBy = userId;
    violationType.deletedAt = new Date();
    this.redis.del(
      `violation-type:findone:${JSON.stringify({ id, schoolId })}`,
    );
    this.redis.updateRedis(this.cacheNameVersion);
    this.updateCorrelateClass(
      violationType.violations.map((v) => {
        return v.id;
      }),
      schoolId,
    );
    await this.violationTypeRepository.saveDeleteViolationType(violationType);
    this.loggerService.crateLog({
      type: LogTypeEnum.DELETE_VIOLATION_TYPE,
      userId,
      metadata: { id },
      message: 'Violation Type Delete',
    });
    return violationType;
  }
}
