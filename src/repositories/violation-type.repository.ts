import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { SchoolEntity } from 'src/entities/school.entity';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { CreateViolationTypeBatchDto } from 'src/modules/violation-type/dto/create-violation-type.dto';
import { QueryViolationTypeDto } from 'src/modules/violation-type/dto/query-violation-type.dto';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class ViolationTypeRepository extends Repository<ViolationTypeEntity> {
  async saveDeleteViolationType(violationType: ViolationTypeEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(violationType);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (error.response.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }
  async saveViolations(
    userId: number,
    createViolationTypeDto: CreateViolationTypeBatchDto,
    schoolId: number,
  ) {
    const { items } = createViolationTypeDto;
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true, violationTypeLimit: true },
      });
      const isDemo = school.isDemo;
      const violationTypeLength = await queryRunner.manager.count(
        ViolationTypeEntity,
        { where: { school: { id: school.id } } },
      );
      if (isDemo && violationTypeLength >= school.violationTypeLimit) {
        throw new BadRequestException(
          'Jumlah Jenis Pelanggaran Melebihi Batas Aplikasi Demo',
        );
      }
      const names = Array.from(new Set(items.map((i) => i.name)));
      const exists = await queryRunner.manager.find(ViolationTypeEntity, {
        where: { name: In(names), school: { id: school.id } },
      });
      const non_exists = names.filter((n) => {
        return !exists.find((e) => e.name === n);
      });
      const classes = items.filter((i) => non_exists.includes(i.name));
      let violations = classes.map((n) => {
        const data = new ViolationTypeEntity();
        data.name = n.name;
        data.school = school;
        data.createdBy = userId;
        data.point = n.point;
        return data;
      });
      if (isDemo) {
        violations = violations.splice(10 - violationTypeLength);
      }
      await queryRunner.manager.save(violations);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (error.response.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  findAll(
    filter: QueryViolationTypeDto,
    pageOptionsDto: PageOptionsDto,
    schoolId: number,
  ) {
    const { page, skip, take, order } = pageOptionsDto;
    const query = this.datasource
      .createQueryBuilder(ViolationTypeEntity, 'violationType')
      .leftJoin('violationType.violations', 'violations')
      .leftJoin('violations.students', 'students')
      .leftJoin('violationType.school', 'school')
      .select([
        'violationType.id',
        'violationType.point',
        'violationType.name',
        'violations.id',
        'students.id',
      ])
      .where((qb) => {
        qb.andWhere('school.id = :schoolId', { schoolId });
        const { search, studentId, violationId } = filter;
        if (violationId) {
          qb.andWhere('violations.id = :violationId', { violationId });
        }
        if (studentId) {
          qb.andWhere('students.nationalStudentId = :studentId', { studentId });
        }
        if (search) {
          qb.andWhere('lower(violationType.name) LIKE lower(:search)', {
            search: `%${search}%`,
          });
        }
      });

    if (page && take) {
      query.skip(skip).take(take);
    }
    query.orderBy('violationType.id', order);
    return query.getManyAndCount();
  }

  async saveViolationTypeCreate(
    violationType: ViolationTypeEntity,
    schoolId: number,
  ) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true, violationTypeLimit: true },
      });
      const isDemo = school.isDemo;
      if (isDemo) {
        const violationTypeLength =
          await queryRunner.manager.count(ViolationTypeEntity);
        if (violationTypeLength >= school.violationTypeLimit) {
          throw new BadRequestException(
            'Jumlah Jenis Pelanggaran Melebihi Batas Aplikasi Demo',
          );
        }
      }
      await queryRunner.manager.save(violationType);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (error.response.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  async saveViolationType(violationType: ViolationTypeEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(violationType);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      if (error.response.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  constructor(private readonly datasource: DataSource) {
    super(ViolationTypeEntity, datasource.createEntityManager());
  }
}
