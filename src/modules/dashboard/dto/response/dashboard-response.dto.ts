import { Expose } from 'class-transformer';
import { StudentEntity } from 'src/entities/student.entity';
import { ViolationTypeEntity } from 'src/entities/violation-type.entity';
import { BarChartDataResponseDto } from './bar-chart-data-response.dto';

export class DashboardResponseDto {
  @Expose({ name: 'total_student' })
  totalStudent: number;

  @Expose({ name: 'total_point' })
  totalPoint: number;

  @Expose({ name: 'total_violation' })
  totalViolation: number;

  @Expose({ name: 'student_with_most_violation' })
  studentWithMostViolation: StudentEntity;

  @Expose({ name: 'most_violation_type' })
  mostViolationType: ViolationTypeEntity;

  @Expose({ name: 'student_with_point_more_than_30' })
  studentWithPointMoreThan30: StudentEntity[];

  @Expose({ name: 'student_with_point_more_than_50' })
  studentWithPointMoreThan50: StudentEntity[];

  @Expose({ name: 'student_with_point_more_than_70' })
  studentWithPointMoreThan70: StudentEntity[];

  @Expose({ name: 'violation_percentage_from_last_week' })
  violationPercentageFromLastWeek: number;

  @Expose({ name: 'violation_percentage_from_last_month' })
  violationPercentageFromLastMonth: number;

  @Expose({ name: 'leaderboard' })
  leaderboard: BarChartDataResponseDto[];
}
