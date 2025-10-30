import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { ViolationEntity } from 'src/entities/violation.entity';
import { DataSource } from 'typeorm';
import { DashboardResponseDto } from './dto/response/dashboard-response.dto';
import { StudentEntity } from 'src/entities/student.entity';
import {
  convertMonthNumberToShortMonthName,
  formatDate,
  formatDateToDateMonthString,
  fromStartOfLastMonthToTodayOnLastMonth,
  fromStartOfThisMonthToToday,
} from 'src/commons/utils/date.util';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { UserEntity } from 'src/entities/user.entity';
import { QueryChartDto } from './dto/query-chart.dto';
import { ChartType } from 'src/commons/enums/chart-type.enum';
import {
  ChartData,
  ChartDataResponseDto,
} from './dto/response/chart-data-response.dto';
import { BarChartDataResponseDto } from './dto/response/bar-chart-data-response.dto';
import { SuperadminDashboardDataDto } from './dto/response/superadmin-dashboard-data.dto';

@Injectable()
export class DashboardService {
  async getSuperadminData(
    dateRange: QueryDateRangeDto,
  ): Promise<SuperadminDashboardDataDto> {
    try {
      const { startDate, finishDate } = dateRange;

      // Get total schools
      const totalActiveSchool = await this.datasource.manager.count(
        SchoolEntity,
        {
          where: { isActive: true },
        },
      );
      const totalInactiveSchool = await this.datasource.manager.count(
        SchoolEntity,
        {
          where: { isActive: false },
        },
      );

      // Get total violations
      const totalViolationsQuery = this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.school', 'school')
        .where('school.isActive = :isActive', { isActive: true })
        .andWhere('violation.deletedAt IS NULL');

      if (startDate && finishDate) {
        totalViolationsQuery.andWhere(
          'violation.date BETWEEN :startDate AND :finishDate',
          {
            startDate,
            finishDate,
          },
        );
      }

      const totalViolations = await totalViolationsQuery.getCount();

      // Get total users
      const totalUsers = await this.datasource.manager.count(UserEntity, {
        where: {
          school: { isActive: true },
          isActive: true,
        },
      });

      // Get total students
      const totalStudents = await this.datasource.manager.count(StudentEntity, {
        where: {
          school: { isActive: true },
        },
      });

      // Get school with most violations
      const mostViolationSchoolQuery = this.datasource
        .createQueryBuilder(SchoolEntity, 'school')
        .leftJoin('school.violations', 'violations')
        .select([
          'school.id',
          'school.name',
          'COUNT(violations.id) as violationCount',
        ])
        .where('school.isActive = :isActive', { isActive: true })
        .andWhere('violations.deletedAt IS NULL');

      if (startDate && finishDate) {
        mostViolationSchoolQuery.andWhere(
          'violations.date BETWEEN :startDate AND :finishDate',
          {
            startDate,
            finishDate,
          },
        );
      }

      const mostViolationSchoolResult = await mostViolationSchoolQuery
        .groupBy('school.id')
        .addGroupBy('school.name')
        .orderBy('violationCount', 'DESC')
        .limit(1)
        .getRawOne();

      const mostViolationSchool = mostViolationSchoolResult
        ? {
            id: Number(mostViolationSchoolResult.school_id),
            name: mostViolationSchoolResult.school_name,
            violationCount: Number(mostViolationSchoolResult.violationCount),
          }
        : {
            id: 0,
            name: 'No data',
            violationCount: 0,
          };

      // Get violations this month and last month
      const [strMnth, tdy] = fromStartOfThisMonthToToday();
      const [lsMnth, tdyLmnth] = fromStartOfLastMonthToTodayOnLastMonth();

      const violationsThisMonth = await this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.school', 'school')
        .where('school.isActive = :isActive', { isActive: true })
        .andWhere('violation.date BETWEEN :startDate AND :finishDate', {
          startDate: formatDate(strMnth),
          finishDate: formatDate(tdy),
        })
        .andWhere('violation.deletedAt IS NULL')
        .getCount();

      const violationsLastMonth = await this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.school', 'school')
        .where('school.isActive = :isActive', { isActive: true })
        .andWhere('violation.date BETWEEN :startDate AND :finishDate', {
          startDate: formatDate(lsMnth),
          finishDate: formatDate(tdyLmnth),
        })
        .andWhere('violation.deletedAt IS NULL')
        .getCount();

      // Create and return the response
      const response = new SuperadminDashboardDataDto();
      response.totalActiveSchool = totalActiveSchool;
      response.totalInactiveSchool = totalInactiveSchool;
      response.totalViolations = totalViolations;
      response.totalUsers = totalUsers;
      response.totalStudents = totalStudents;
      response.mostViolationSchool = mostViolationSchool;
      response.violationsThisMonth = violationsThisMonth;
      response.violationsLastMonth = violationsLastMonth;

      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Internal server error');
    }
  }

  async getChartData(query: QueryChartDto, schoolId: number) {
    const { type } = query;
    const response = new ChartDataResponseDto();
    switch (type) {
      case ChartType.DAYS:
        const daysData = await this.datasource.query<
          {
            date: string;
            data_count: number;
          }[]
        >(
          `
          SELECT 
            (NOW() - INTERVAL '1 day' * i)::DATE AS "date",
            COUNT(v.id) AS "data_count"
          FROM generate_series(0, 6) i
          LEFT JOIN "violations" v ON 
            DATE(v."date") = (NOW() - INTERVAL '1 day' * i)::DATE
            AND v."deleted_at" IS NULL
          LEFT JOIN "schools" s ON v."school_id" = s."id"
          WHERE s."id" = $1 OR v."school_id" IS NULL
          GROUP BY (NOW() - INTERVAL '1 day' * i)::DATE
          ORDER BY "date" ASC
        `,
          [schoolId],
        );

        response.data = daysData.map((v) => {
          const a = new ChartData();
          a.key = formatDateToDateMonthString(new Date(v.date));
          a.value = v.data_count;
          return a;
        });
        break;

      case ChartType.WEEKS:
        const weeksData = await this.datasource.query<
          {
            from: string;
            to: string;
            data_count: number;
          }[]
        >(
          `
          SELECT 
            (date_trunc('week', NOW()) - INTERVAL '1 week' * i)::DATE AS "from",
            (date_trunc('week', NOW()) - INTERVAL '1 week' * i + INTERVAL '6 days')::DATE AS "to",
            COUNT(v.id) AS "data_count"
          FROM generate_series(0, 6) i
          LEFT JOIN "violations" v ON 
            DATE(v."date") BETWEEN 
              (date_trunc('week', NOW()) - INTERVAL '1 week' * i)::DATE
              AND
              (date_trunc('week', NOW()) - INTERVAL '1 week' * i + INTERVAL '6 days')::DATE
            AND v."deleted_at" IS NULL
          LEFT JOIN "schools" s ON v."school_id" = s."id"
          WHERE s."id" = $1 OR v."school_id" IS NULL
          GROUP BY "from", "to"
          ORDER BY "from" ASC
        `,
          [schoolId],
        );

        response.data = weeksData.map((v) => {
          const a = new ChartData();
          a.key = `${formatDateToDateMonthString(new Date(v.from))} - ${formatDateToDateMonthString(new Date(v.to))}`;
          a.value = v.data_count;
          return a;
        });
        break;

      case ChartType.MONTHS:
        const monthsData = await this.datasource.query<
          {
            date: string;
            data_count: number;
          }[]
        >(
          `
          SELECT 
            date_trunc('month', NOW()) - INTERVAL '1 month' * i AS "date",
            COUNT(v.id) AS "data_count"
          FROM generate_series(0, 6) i
          LEFT JOIN "violations" v ON 
            DATE(v."date") BETWEEN 
              date_trunc('month', NOW()) - INTERVAL '1 month' * i
              AND
              date_trunc('month', NOW()) - INTERVAL '1 month' * i + INTERVAL '1 month' - INTERVAL '1 day'
            AND v."deleted_at" IS NULL
          LEFT JOIN "schools" s ON v."school_id" = s."id"
          WHERE s."id" = $1 OR v."school_id" IS NULL
          GROUP BY date_trunc('month', NOW()) - INTERVAL '1 month' * i
          ORDER BY "date" ASC
        `,
          [schoolId],
        );

        response.data = monthsData.map((v) => {
          const a = new ChartData();
          a.key = convertMonthNumberToShortMonthName(
            new Date(v.date).getMonth(),
          );
          a.value = v.data_count;
          return a;
        });
        break;
    }
    return response;
  }

  constructor(private readonly datasource: DataSource) {}

  async getData(dateRange: QueryDateRangeDto, schoolId: number) {
    try {
      const { startDate, finishDate } = dateRange;
      const data = await this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.creator', 'creator')
        .leftJoin('violation.students', 'student')
        .leftJoin('violation.violationTypes', 'violationTypes')
        .leftJoin('violation.school', 'school')
        .select(
          'coalesce(sum(coalesce(violationTypes.point,0)),0)',
          'totalPoint',
        )
        .addSelect('count(violation.id)', 'totalViolation')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere(
              `violation.date BETWEEN '${startDate}' AND '${finishDate}'`,
            );
          }
        })
        .getRawOne<{ totalPoint: number }>();
      const mostStudent = await this.datasource
        .createQueryBuilder(StudentEntity, 'student')
        .leftJoin('student.violations', 'violations')
        .leftJoin('violations.school', 'school')
        .select('student.id', 'id')
        .addSelect('student.name', 'name')
        .addSelect('student.nationalStudentId', 'nationalStudentId')
        .addSelect('student.schoolStudentId', 'schoolStudentId')
        .addSelect('count(violations.id)', 'totalViolation')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .groupBy('student.id')
        .addGroupBy('student.name')
        .addGroupBy('student.nationalStudentId')
        .addGroupBy('student.schoolStudentId')
        .orderBy('"totalViolation"', 'DESC')
        .getRawOne();
      const dsb = new DashboardResponseDto();
      dsb.totalPoint = Number(data.totalPoint);
      dsb.studentWithMostViolation = mostStudent;
      const moreThan30 = await this.datasource
        .createQueryBuilder(StudentEntity, 'student')
        .leftJoin('student.violations', 'violations')
        .leftJoin('violations.violationTypes', 'violationTypes')
        .leftJoin('violations.school', 'school')
        .select([
          'student.id',
          'student.name',
          'student.nationalStudentId',
          'student.schoolStudentId',
        ])
        .addSelect('SUM(violationTypes.point)', 'point')
        .having('SUM(violationTypes.point) > 30')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .groupBy('student.id')
        .addGroupBy('student.name')
        .addGroupBy('student.nationalStudentId')
        .addGroupBy('student.schoolStudentId')
        .getMany();
      const moreThan50 = await this.datasource
        .createQueryBuilder(StudentEntity, 'student')
        .leftJoin('student.violations', 'violations')
        .leftJoin('violations.violationTypes', 'violationTypes')
        .leftJoin('violations.school', 'school')
        .select([
          'student.id',
          'student.name',
          'student.nationalStudentId',
          'student.schoolStudentId',
        ])
        .addSelect('sum(violationTypes.point)', 'point')
        .having('SUM(violationTypes.point) > 50')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .groupBy('student.id')
        .addGroupBy('student.name')
        .addGroupBy('student.nationalStudentId')
        .addGroupBy('student.schoolStudentId')
        .getMany();
      const moreThan70 = await this.datasource
        .createQueryBuilder(StudentEntity, 'student')
        .leftJoin('student.violations', 'violations')
        .leftJoin('violations.violationTypes', 'violationTypes')
        .leftJoin('violations.school', 'school')
        .select([
          'student.id',
          'student.name',
          'student.nationalStudentId',
          'student.schoolStudentId',
        ])
        .addSelect('sum(violationTypes.point)', 'point')
        .having('SUM(violationTypes.point) > 70')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .groupBy('student.id')
        .addGroupBy('student.name')
        .addGroupBy('student.nationalStudentId')
        .addGroupBy('student.schoolStudentId')
        .getMany();
      const [strMnth, tdy] = fromStartOfThisMonthToToday();
      const [lsMnth, tdyLmnth] = fromStartOfLastMonthToTodayOnLastMonth();
      const violationsThisMonth = await this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.school', 'school')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          qb.andWhere('violation.date BETWEEN :startDate AND :finishDate', {
            startDate: formatDate(strMnth),
            finishDate: formatDate(tdy),
          });
        })
        .getCount();
      dsb.totalViolation = Number(violationsThisMonth);
      const violationsLastMonth = await this.datasource
        .createQueryBuilder(ViolationEntity, 'violation')
        .leftJoin('violation.school', 'school')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          qb.andWhere('violation.date BETWEEN :startDate AND :finishDate', {
            startDate: formatDate(lsMnth),
            finishDate: formatDate(tdyLmnth),
          });
        })
        .getCount();

      const mostViolationType = await this.datasource
        .createQueryBuilder(ViolationTypeEntity, 'violationType')
        .leftJoin('violationType.violations', 'violations')
        .leftJoin('violations.school', 'school')
        .select([
          'violationType.id',
          'violationType.name',
          'violationType.point',
          'COUNT(violations.id) AS totalViolation',
        ])
        .groupBy('violationType.id')
        .addGroupBy('violationType.name')
        .addGroupBy('violationType.point')
        .orderBy('totalViolation', 'DESC')
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .limit(1)
        .getOne();
      const leaderBoard = await this.datasource
        .createQueryBuilder(ViolationTypeEntity, 'violationType')
        .leftJoin('violationType.violations', 'violations')
        .leftJoin('violations.school', 'school')
        .select([
          'violationType.name as name',
          'violationType.id as id',
          'COUNT(violations.id) AS totalviolation',
        ])
        .where((qb) => {
          qb.andWhere('school.id = :schoolId', { schoolId });
          if (startDate && finishDate) {
            qb.andWhere('violations.date BETWEEN :startDate AND :finishDate', {
              startDate,
              finishDate,
            });
          }
        })
        .groupBy('violationType.name')
        .addGroupBy('violationType.id')
        .orderBy('totalViolation', 'DESC')
        .limit(3)
        .getRawMany<{ name: string; id: number; totalviolation: number }>();
      const leaderboard = leaderBoard.map((lb) => {
        const lbb = new BarChartDataResponseDto();
        lbb.name = lb.name;
        lbb.value = Number(lb.totalviolation);
        return lbb;
      });
      dsb.leaderboard = leaderboard;
      dsb.mostViolationType = mostViolationType;
      dsb.violationPercentageFromLastMonth = Math.floor(
        ((violationsThisMonth - violationsLastMonth) /
          (violationsLastMonth === 0 ? 1 : violationsLastMonth)) *
          100,
      );
      dsb.studentWithPointMoreThan30 = moreThan30;
      dsb.studentWithPointMoreThan50 = moreThan50;
      dsb.studentWithPointMoreThan70 = moreThan70;
      dsb.totalStudent = await this.datasource.manager.count(StudentEntity, {
        where: { school: { id: schoolId } },
      });
      return dsb;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    }
  }
}
