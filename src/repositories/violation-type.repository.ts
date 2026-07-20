import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { Order } from 'src/commons/enums/order.enum';
import { SchoolEntity } from 'src/entities/school.entity';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { CreateViolationTypeBatchDto } from 'src/modules/violation-type/dto/create-violation-type.dto';
import { QueryViolationTypeDto } from 'src/modules/violation-type/dto/query-violation-type.dto';
import { VioltaionTypeDetailDto } from 'src/modules/violation-type/dto/violation-type-detail.dto';
import { DataSource, In, Repository } from 'typeorm';

@Injectable()
export class ViolationTypeRepository extends Repository<ViolationTypeEntity> {
  async findOneV(id: number, schoolId: number) {
    const qb = await this.datasource.createQueryBuilder(ViolationTypeEntity, 'vt')
      .leftJoin('vt.violations', 'vi')
      .leftJoin('vi.students', 'students')
      .select([
        'vt.id v_id',
        'vt.name v_name',
        'vt.point v_point',
        'count(DISTINCT vi.id) as total_violated',
        'count(DISTINCT students.id) as total_student',
      ])
      .where('vt.id = :id', { id })
      .andWhere('vt.school_id = :schoolId', { schoolId })
      .groupBy('vt.id')
      .getRawOne();
    const vT = new VioltaionTypeDetailDto();
    vT.id = qb.v_id;
    vT.name = qb.v_name;
    vT.point = qb.v_point;
    vT.totalViolated = parseInt(qb.total_violated);
    vT.totalStudent = parseInt(qb.total_student);
    return vT;
  }

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

  async findAll(
    filter: QueryViolationTypeDto,
    pageOptionsDto: PageOptionsDto,
    schoolId: number,
  ) {
    const { page, skip, take, order } = pageOptionsDto;
    const query = this.datasource
      .createQueryBuilder(ViolationTypeEntity, 'vt')
      .leftJoin('vt.violations', 'v')
      .leftJoin('v.students', 's')
      .leftJoin('vt.school', 'school')
      .select([
        'vt.id v_id',
        'vt.point v_point',
        'vt.name v_name',
        'count(DISTINCT v.id) as total_violated',
        'count(DISTINCT s.id) as total_student'
      ])
      .where((qb) => {
        qb.andWhere('school.id = :schoolId', { schoolId });
        const { search, studentId, violationId } = filter;
        if (violationId) {
          qb.andWhere('v.id = :violationId', { violationId });
        }
        if (studentId) {
          qb.andWhere('s.nationalStudentId = :studentId', { studentId });
        }
        if (search) {
          qb.andWhere('lower(vt.name) LIKE lower(:search)', {
            search: `%${search}%`,
          });
        }
      })
      .groupBy('vt.id')
      .orderBy('total_violated', Order.DESC);

    if (page && take) {
      query.offset(skip).limit(take);
    }
    return { data: await query.getRawMany<{ v_id: number, v_point: number, v_name: string, total_violated: number, total_student: number }>(), count: await query.getCount() };
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
