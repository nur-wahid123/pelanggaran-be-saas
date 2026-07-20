import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { VioltaionTypeDetailDto } from 'src/modules/violation-type/dto/violation-type-detail.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { ViolationTypeEnum } from 'src/commons/enums/violation-type.enum';
import { ImageLinks } from 'src/entities/image-links.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { StudentEntity } from 'src/entities/student.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { ViolationEntity } from 'src/entities/violation.entity';
import { ImageService } from 'src/modules/image/image.service';
import { QueryViolationDto } from 'src/modules/violation/dto/query-violation.dto';
import { StudentViolationsDto } from 'src/modules/violation/dto/student-violations.dto';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ViolationRepository extends Repository<ViolationEntity> {
  async removeAll() {
    const qr = this.datasource.createQueryRunner();
    try {
      await qr.connect();
      await qr.startTransaction();
      const allViolations = await qr.manager
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.image', 'image')
        .select(['violation.id', 'image.id'])
        .getMany();
      const allImageIds = allViolations
        .filter((v) => v.image !== null && v.image !== undefined)
        .map((v) => v.image.id);
      await Promise.all(
        allImageIds.map((id) => this.imageService.removeQr(id, qr)),
      );
      await qr.manager.remove(allViolations);
      await qr.commitTransaction();
      return true;
    } catch (error) {
      await qr.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await qr.release();
    }
  }

  async createViolation(
    students: StudentEntity[],
    violationTypes: ViolationTypeEntity[],
    image: number | null,
    user: UserEntity,
    note: string,
    schoolId: number,
  ) {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();
      const school = await qR.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true, violationLimit: true },
      });
      const isDemo = school.isDemo;
      if (isDemo) {
        const violationLength = await qR.manager.count(ViolationEntity, {
          where: { school: { id: school.id } },
        });
        if (violationLength >= school.violationLimit) {
          throw new BadRequestException(
            'Dilarang Menambah Pelanggaran lebih 10 pada Aplikasi Demo',
          );
        }
      }
      let imageLink: ImageLinks | null = null;
      if (image) {
        imageLink = await qR.manager.findOne(ImageLinks, {
          where: { id: image },
        });
      }
      const violation = new ViolationEntity();
      violation.creator = user;
      if (note) {
        violation.note = note;
      }
      if (image) {
        violation.image = imageLink;
        imageLink.violation = violation;
      }
      violation.date = new Date();
      violation.students = students;
      violation.violationTypes = violationTypes;
      violation.createdBy = user.id;
      violation.school = school;
      if (image) {
        await qR.manager.save(imageLink);
      }
      await qR.manager.save(violation);
      await qR.commitTransaction();
      return violation;
    } catch (error) {
      console.log(error);
      await qR.rollbackTransaction();
      throw new InternalServerErrorException('internal server error');
    } finally {
      await qR.release();
    }
  }

  async saveViolation(violation: ViolationEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      await queryRunner.manager.save(violation);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  findAll(
    filter: QueryViolationDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
    schoolId: number,
  ): Promise<[any[], number]> {
    const { type } = filter;
    try {
      switch (type) {
        case ViolationTypeEnum.COLLECTION:
          return this.findAllViolationCollection(
            filter,
            pageOptionsDto,
            dateRange,
            schoolId,
          );
        case ViolationTypeEnum.PER_STUDENT:
          return this.findAllViolationStudent(
            filter,
            pageOptionsDto,
            dateRange,
            schoolId,
          );
        case ViolationTypeEnum.PER_VIOLATION_TYPE:
          return this.findAllViolationType(
            filter,
            pageOptionsDto,
            dateRange,
            schoolId,
          );
        default:
          throw new InternalServerErrorException('internal server error');
      }
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  async findAllViolationCollection(
    filter: QueryViolationDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
    schoolId: number,
  ): Promise<[any[], number]> {
    const { search, studentId, violationTypeId } = filter;
    const { startDate, finishDate } = dateRange;
    const qB = this.datasource
      .createQueryBuilder(ViolationEntity, 'vi')
      .leftJoin('vi.creator', 'creator')
      .leftJoin('vi.students', 'student')
      .leftJoin('vi.violationTypes', 'violationType')
      .leftJoin('vi.image', 'image')
      .leftJoin('image.images', 'images')
      .leftJoin('vi.school', 'school')
      .select('vi.id')
      .where((qb) => {
        qb.andWhere('school.id = :schoolId', { schoolId });
        if (studentId) {
          qb.andWhere('student.id = :studentId', {
            studentId: Number(studentId),
          });
        }
        if (violationTypeId) {
          qb.andWhere('violationType.id = :violationTypeId', {
            violationTypeId: Number(violationTypeId),
          });
        }
        if (search) {
          qb.andWhere(
            '(lower(violationType.name) LIKE lower(:search) or lower(student.name) LIKE lower(:search) or lower(creator.name) LIKE lower(:search))',
            {
              search: `%${search}%`,
            },
          );
        }
        if (startDate && finishDate) {
          qb.andWhere(`vi.date BETWEEN :startDate AND :finishDate`, {
            startDate: `${startDate} 00:00:00`,
            finishDate: `${finishDate} 23:59:59`,
          });
        }
      })
      .orderBy('vi.id', 'DESC');

    const { page, skip, take } = pageOptionsDto;
    if (page && take) {
      qB.skip(skip).take(take);
    }

    const queryRes1 = await qB.getMany();
    const queryRes1Count = await qB.getCount();
    const ids = queryRes1.map((vi) => {
      return vi.id;
    });
    const qB2 = this.datasource
      .createQueryBuilder(ViolationEntity, 'vi')
      .leftJoin('vi.creator', 'creator')
      .leftJoin('vi.students', 'student')
      .leftJoin('vi.violationTypes', 'violationType')
      .leftJoin('vi.image', 'image')
      .leftJoin('image.images', 'images')
      .leftJoin('vi.school', 'school')
      .select(['violationType.id', 'violationType.point', 'violationType.name'])
      .addSelect(['student.name', 'student.id'])
      .addSelect(['image.id', 'images.id', 'images.key'])
      .addSelect(['vi.createdAt', 'vi.date', 'vi.id'])
      .addSelect(['creator.name', 'creator.id'])
      .where(ids.length ? 'vi.id IN (:...ids)' : '1=0', { ids });

    qB2.orderBy('vi.id', 'DESC');
    return [await qB2.getMany(), queryRes1Count];
  }

  async findAllViolationType(
    filter: QueryViolationDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
    schoolId: number,
  ): Promise<[any[], number]> {
    const { search, studentId, violationTypeId } = filter;
    const { startDate, finishDate } = dateRange;
    const qB = this.datasource
      .createQueryBuilder(ViolationTypeEntity, 'violationTypes')
      .leftJoin('violationTypes.violations', 'vi')
      .leftJoin('vi.creator', 'creator')
      .leftJoin('vi.students', 'student')
      .leftJoin('vi.school', 'school')
      .select(['violationTypes.id'])
      .addSelect('COUNT(COALESCE(vi.id, 0))', 'total_count')
      .where((qb) => {
        qb.andWhere('school.id = :schoolId', { schoolId }); // Filter by schoolId
        if (studentId) {
          qb.andWhere('student.id = :studentId', {
            studentId: Number(studentId),
          });
        }
        if (violationTypeId) {
          qb.andWhere('violationTypes.id = :violationTypeId', {
            violationTypeId: Number(violationTypeId),
          });
        }
        if (search) {
          qb.andWhere(
            '(lower(violationTypes.name) LIKE lower(:search) or lower(student.name) LIKE lower(:search) or lower(creator.name) LIKE lower(:search))',
            {
              search: `%${search}%`,
            },
          );
        }
      })
      .groupBy('violationTypes.id')
      .orderBy('total_count', 'DESC');

    const { page, skip, take } = pageOptionsDto;
    if (page && take) {
      qB.skip(skip).take(take);
    }
    const qB1Res = await qB.getMany();
    const qB1ResCount = await qB.getCount();
    const ids = qB1Res.map((vt) => vt.id);
    const qB2 = this.datasource
      .createQueryBuilder(ViolationTypeEntity, 'violationTypes')
      .leftJoin('violationTypes.violations', 'vi')
      .leftJoin('vi.students', 'student')
      .select([
        'violationTypes.name violation_name',
        'violationTypes.point violation_point',
        'violationTypes.id violation_id',
        'count(distinct vi.id) total_violated',
        'count(distinct student.id) total_student',
      ])
      .leftJoin('vi.school', 'school')
      .where(ids.length ? 'violationTypes.id IN (:...ids)' : '1=0', { ids })
      .groupBy('violationTypes.id')
      .orderBy("total_violated", 'DESC');
    const res = await qB2.getRawMany<{
      violation_name: string;
      violation_point: number;
      violation_id: number;
      total_violated: number;
      total_student: number;
    }>();
    const violationTypes = res.map((r) => {
      const vT = new VioltaionTypeDetailDto();
      vT.id = r.violation_id;
      vT.name = r.violation_name;
      vT.point = r.violation_point;
      vT.totalViolated = r.total_violated;
      vT.totalStudent = r.total_student;
      return vT;
    })

    return [violationTypes, qB1ResCount];
  }

  async findAllViolationStudent(
    filter: QueryViolationDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
    schoolId: number,
  ): Promise<[any[], number]> {
    const { search, studentId, violationTypeId } = filter;
    const { startDate, finishDate } = dateRange;
    const qB = this.datasource
      .createQueryBuilder(StudentEntity, 'st')
      .leftJoin('st.violations', 'vi')
      .leftJoin('vi.creator', 'creator')
      .leftJoin('st.studentClass', 'studentClass')
      .leftJoin('vi.violationTypes', 'violationTypes')
      .leftJoin('vi.school', 'school')
      .select(['st.id'])
      .addSelect('SUM(COALESCE(violationTypes.point, 0))', 'total_points')
      .where((qb) => {
        qb.andWhere('school.id = :schoolId', { schoolId });
        if (studentId) {
          qb.andWhere('st.id = :studentId', { studentId: Number(studentId) });
        }
        if (violationTypeId) {
          qb.andWhere('violationTypes.id = :violationTypeId', {
            violationTypeId: Number(violationTypeId),
          });
        }
        if (search) {
          qb.andWhere(
            '(lower(violationTypes.name) LIKE lower(:search) or lower(st.name) LIKE lower(:search) or lower(creator.name) LIKE lower(:search))',
            {
              search: `%${search}%`,
            },
          );
        }
      })
      .groupBy('st.id')
      .orderBy('total_points', 'DESC')
    // .addOrderBy('st.id', 'DESC');

    const { page, skip, take } = pageOptionsDto;
    if (page && take) {
      qB.skip(skip).take(take);
    }

    const qB1Res = await qB.getMany().catch((error) => {
      console.log(error);
      throw error
    });
    const qB1ResCount = await qB.getCount();
    const ids = qB1Res.map((st) => st.id);
    const qB2 = this.datasource
      .createQueryBuilder(StudentEntity, 'st')
      .leftJoin('st.violations', 'vi')
      .leftJoin('st.studentClass', 'studentClass')
      .leftJoin('vi.violationTypes', 'violationTypes')
      // Note: Removed vi.image join if it's breaking the per-student group total
      .select([
        'st.id',
        'st.name',
        'st.nationalStudentId',
        'st.schoolStudentId',
        'studentClass.id',
        'studentClass.name',
      ])
      // Typecast or parse strings to numbers if your DB driver returns them as strings
      .addSelect('CAST(SUM(COALESCE(violationTypes.point, 0)) AS INTEGER)', 'total_points')
      .addSelect('CAST(COUNT(DISTINCT vi.id) AS INTEGER)', 'violation_count')
      .where(ids.length ? 'st.id IN (:...ids)' : '1=0', { ids })
      // Group strictly by the student identity and their direct relation strings
      .groupBy('st.id')
      .addGroupBy('studentClass.id')
      // Order by the literal aggregate formula rather than the alias name to ensure SQL safety
      .orderBy('SUM(COALESCE(violationTypes.point, 0))', 'DESC')


    const students = await qB2.getRawMany();
    const dto: StudentViolationsDto[] = students.map((student) => {
      const stdvdt = new StudentViolationsDto()
      stdvdt.totalPoints = +student.total_points;
      stdvdt.violationCount = +student.violation_count;
      stdvdt.id = student.st_id;
      stdvdt.name = student.st_name;
      stdvdt.nationalStudentId = student.st_national_student_id;
      stdvdt.schoolStudentId = student.st_school_student_id;
      stdvdt.studentClass = { id: student.studentClass_id, name: student.studentClass_name } as any;
      return stdvdt;
    });

    return [dto, qB1ResCount];
  }


  async saveViolations(violations: ViolationEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      await queryRunner.manager.save(violations);
      await queryRunner.commitTransaction();
      return violations;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }

  async findViolations(violationTypeId: number[], schoolId: number) {
    const qb = this.datasource
      .createQueryBuilder(ViolationTypeEntity, 'violationType')
      .leftJoin('violationType.school', 'school');
    qb.where('violationType.id IN (:...ids)', { ids: violationTypeId });
    qb.andWhere('school.id = :schoolId', { schoolId });
    return qb.getMany();
  }
  constructor(
    private readonly datasource: DataSource,
    private readonly imageService: ImageService,
  ) {
    super(ViolationEntity, datasource.createEntityManager());
  }
}
