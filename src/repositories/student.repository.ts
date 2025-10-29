import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { Order } from 'src/commons/enums/order.enum';
import { ClassEntity } from 'src/entities/class.entity';
import { StudentEntity } from 'src/entities/student.entity';
import { ViolationEntity } from 'src/entities/violation.entity';
import { CreateStudentBatchDto } from 'src/modules/student/dto/create-student.dto';
import { StudentResponse } from 'src/modules/student/dto/student-response.dto';
import { DataSource, In, Repository } from 'typeorm';
import { SchoolEntity } from '../entities/school.entity';

@Injectable()
export class StudentRepository extends Repository<StudentEntity> {
  findAllStudentSearch(
    query: FilterDto,
    pageOptionsDto: PageOptionsDto,
  ): Promise<[StudentEntity[], number]> {
    const { search } = query;
    const { page, take, skip } = pageOptionsDto;

    const Qb = this.createQueryBuilder('student')
      .select(['student.id', 'student.name'])
      .where((qb) => {
        if (search) {
          qb.andWhere('LOWER(student.name) LIKE LOWER(:search)', {
            search: `%${search}%`,
          });
        }
      })
      .orderBy('student.name', Order.ASC);
    if (page && take) {
      Qb.skip(skip).take(take);
    }
    return Qb.getManyAndCount();
  }

  async findAllStudent(
    query: FilterDto,
    pageOptionsDto: PageOptionsDto,
    schoolId: number,
  ): Promise<[StudentResponse[], number]> {
    const { search } = query;
    const { take, skip } = pageOptionsDto;

    // Add join to student.school and filter by schoolId
    const countQb = this.createQueryBuilder('student')
      .leftJoin('student.studentClass', 'studentClass')
      .leftJoin('student.school', 'school')
      .where('student.deleted_at IS NULL')
      .andWhere('school.id = :schoolId', { schoolId });

    if (search) {
      countQb.andWhere('LOWER(student.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const totalCount = await countQb.getCount();

    const studentIdsSubQuery = this.createQueryBuilder('student')
      .select('student.id', 'student_id')
      .addSelect((subQuery) => {
        return subQuery
          .select('COALESCE(SUM(violation_type.point), 0)', 'totalPoints')
          .from('violations', 'v')
          .leftJoin(
            'violations_violation_types_violation_types',
            'vvt',
            'vvt.violations_id = v.id',
          )
          .leftJoin(
            'violation_types',
            'violation_type',
            'violation_type.id = vvt.violation_types_id AND violation_type.deleted_at IS NULL',
          )
          .leftJoin(
            'violations_students_students',
            'vss',
            'vss.violations_id = v.id',
          )
          .where('vss.students_id = student.id')
          .andWhere('v.deleted_at IS NULL');
      }, 'student_totalPoints')
      .leftJoin('student.studentClass', 'studentClass')
      .leftJoin('student.school', 'school')
      .where('student.deleted_at IS NULL')
      .andWhere('school.id = :schoolId', { schoolId });

    if (search) {
      studentIdsSubQuery.andWhere('LOWER(student.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    studentIdsSubQuery
      .orderBy('"student_totalPoints"', 'DESC')
      .addOrderBy('student.id', 'ASC');

    if (
      typeof skip === 'number' &&
      !Number.isNaN(skip) &&
      typeof take === 'number'
    ) {
      studentIdsSubQuery.limit(take).offset(skip);
    }

    const paginatedStudentIds = await studentIdsSubQuery.getRawMany();
    const studentIds = paginatedStudentIds.map((row) => row.student_id);

    if (studentIds.length === 0) {
      return [[], totalCount];
    }

    const dataQb = this.createQueryBuilder('student')
      .leftJoin('student.studentClass', 'studentClass')
      .leftJoin('student.violations', 'violations')
      .leftJoin('student.school', 'school')
      .select([
        'student.id',
        'student.name',
        'student.nationalStudentId',
        'student.schoolStudentId',
        'studentClass.id',
        'studentClass.name',
        'violations.id',
      ])
      .addSelect((subQuery) => {
        return subQuery
          .select('COALESCE(SUM(violation_type.point), 0)', 'totalPoints')
          .from('violations', 'v')
          .leftJoin(
            'violations_violation_types_violation_types',
            'vvt',
            'vvt.violations_id = v.id',
          )
          .leftJoin(
            'violation_types',
            'violation_type',
            'violation_type.id = vvt.violation_types_id AND violation_type.deleted_at IS NULL',
          )
          .leftJoin(
            'violations_students_students',
            'vss',
            'vss.violations_id = v.id',
          )
          .where('vss.students_id = student.id')
          .andWhere('v.deleted_at IS NULL');
      }, 'student_totalPoints')
      .where('student.id IN (:...studentIds)', { studentIds })
      .andWhere('school.id = :schoolId', { schoolId })
      .orderBy('"student_totalPoints"', 'DESC')
      .addOrderBy('student.id', 'ASC');

    dataQb
      .groupBy('student.id')
      .addGroupBy('student.name')
      .addGroupBy('student.nationalStudentId')
      .addGroupBy('student.schoolStudentId')
      .addGroupBy('studentClass.id')
      .addGroupBy('violations.id')
      .addGroupBy('studentClass.name');

    const rawData = await dataQb.getRawMany();

    const studentMap = new Map<number, StudentResponse>();

    for (const row of rawData) {
      const studentId = row['student_id'];
      if (!studentMap.has(studentId)) {
        const student = new StudentResponse();
        student.id = row['student_id'];
        student.name = row['student_name'];
        student.schoolStudentId = row['student_school_student_id'];
        student.nationalStudentId = row['student_national_student_id'];
        const studentClass = new ClassEntity();
        studentClass.id = row['studentClass_id'];
        studentClass.name = row['studentClass_name'];
        student.studentClass = studentClass;
        student.totalPoints = row['student_totalPoints'];
        student.violations = [];
        studentMap.set(studentId, student);
      }
      if (row['violations_id']) {
        const student = studentMap.get(studentId);
        if (
          !student.violations.some((v: any) => v.id === row['violations_id'])
        ) {
          const violations = student.violations;
          const violation = new ViolationEntity();
          violation.id = row['violations_id'];
          violations.push(violation);
          student.violations = violations;
        }
      }
    }

    const students = Array.from(studentMap.values());

    return [students, totalCount];
  }
  async extractNisn(createStudentDto: CreateStudentBatchDto, schoolId: number) {
    const { items } = createStudentDto;
    const nisns: string[] = [];
    for (let index = 0; index < items.length; index++) {
      const element = items[index];
      nisns.push(element.nisn);
    }
    const students = await this.find({
      where: { nationalStudentId: In(nisns), school: { id: schoolId } },
      select: { id: true, nationalStudentId: true },
    });
    return students;
  }

  async saveStudents(
    userId: number,
    createStudentDto: CreateStudentBatchDto,
    schoolId: number,
  ) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true },
      });
      const isDemo = school.isDemo;
      const studentLength = await queryRunner.manager.count(StudentEntity, {
        where: { school: { id: school.id } },
      });
      if (isDemo && studentLength >= school.studentsLimit) {
        throw new BadRequestException(
          'Jumlah Siswa Melebihi Batas Aplikasi Demo',
        );
      }
      const existsStudents = await this.extractNisn(
        createStudentDto,
        school.id,
      );
      const { items } = createStudentDto;
      let students: StudentEntity[] = [];
      const classNames = Array.from(new Set(items.map((i) => i.className)));
      const classes = await queryRunner.manager.find(ClassEntity, {
        where: { name: In(classNames), school: { id: school.id } },
      });
      const non_exists_classes_string = classNames.filter((c) => {
        return !classes.find((cl) => cl.name === c);
      });
      const non_exists_classes = non_exists_classes_string.map((c) => {
        const classEntity = new ClassEntity();
        classEntity.createdBy = userId;
        classEntity.name = c;
        classEntity.school = school;
        return classEntity;
      });
      if (non_exists_classes.length > 0) {
        const classesLength = await queryRunner.manager.count(ClassEntity, {
          where: { school: { id: school.id } },
        });
        if (isDemo && classesLength + non_exists_classes.length > 10) {
          throw new BadRequestException(
            'Jumlah Kelas melebihi Batas Aplikasi Demo, Jumlah Aplikasi',
          );
        }
        await queryRunner.manager.save(non_exists_classes);
      }
      for (let index = 0; index < items.length; index++) {
        const element = items[index];
        const { className, name, nis, nisn } = element;
        let student: StudentEntity = existsStudents.find((e) => {
          return e.nationalStudentId === nisn;
        });
        if (!student) {
          student = new StudentEntity();
        }
        let classEntity: ClassEntity;
        classEntity = classes.find((c) => c.name === className);
        if (!classEntity) {
          classEntity = non_exists_classes.find((c) => c.name === className);
        }
        student.studentClass = classEntity;
        student.createdBy = userId;
        student.name = name;
        student.nationalStudentId = nisn;
        student.schoolStudentId = nis;
        student.school = school;
        students.push(student);
      }
      if (isDemo && studentLength + students.length > 10) {
        students = students.splice(10 - studentLength);
      }
      await queryRunner.manager.save(students);
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
  async saveStudent(student: StudentEntity, schoolId: number) {
    const queryRunner = this.datasource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      const school = await queryRunner.manager.findOne(SchoolEntity, {
        where: { id: schoolId },
        select: { id: true, isDemo: true, studentsLimit: true },
      });
      const isDemo = school.isDemo;
      if (isDemo) {
        const studentLength = await queryRunner.manager.count(StudentEntity, {
          where: { school: { id: school.id } },
        });
        if (studentLength >= school.studentsLimit) {
          throw new BadRequestException(
            'Jumlah Siswa Melebihi Batas Aplikasi Demo',
          );
        }
      }
      await queryRunner.manager.save(student);
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
    super(StudentEntity, datasource.createEntityManager());
  }
}
