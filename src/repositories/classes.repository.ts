import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { ClassEntity } from 'src/entities/class.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ClassRepository extends Repository<ClassEntity> {
  findAll(schoolId: number, filter: FilterDto, pageOptionsDto: PageOptionsDto) {
    const { page, skip, take, order } = pageOptionsDto;
    const qB = this.datasource
      .createQueryBuilder(ClassEntity, 'class')
      .leftJoin('class.students', 'students')
      .leftJoin('class.school', 'school')
      .select([
        'class.id',
        'class.name',
        'students.id',
        'students.schoolStudentId',
        'students.nationalStudentId',
        'students.name',
      ])
      .where((qb) => {
        const { search } = filter;
        qb.andWhere('school.id = :schoolId', {
          schoolId,
        });
        if (search) {
          qb.andWhere('(lower(class.name) LIKE lower(:search))', {
            search: `%${search}%`,
          });
        }
      });

    if (page && take) {
      qB.skip(skip).take(take);
    }
    qB.orderBy('class.id', order);
    return qB.getManyAndCount();
  }

  async saveClass(newClass: ClassEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      await queryRunner.manager.save(newClass);
      await queryRunner.commitTransaction();
      return newClass;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }
  constructor(private readonly datasource: DataSource) {
    super(ClassEntity, datasource.createEntityManager());
  }

  async saveClassCreate(newClass: ClassEntity, schoolId: number) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true, classesLimit: true },
      });
      const isDemo = school.isDemo;
      const classEntityLength = await queryRunner.manager.count(ClassEntity, {
        where: { school: { id: school.id } },
      });
      if (isDemo && classEntityLength >= school.classesLimit) {
        throw new BadRequestException(
          'Jumlah Jenis Pelanggaran Melebihi Batas Aplikasi Demo',
        );
      }
      await queryRunner.manager.save(newClass);
      await queryRunner.commitTransaction();
      return newClass;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }
}
