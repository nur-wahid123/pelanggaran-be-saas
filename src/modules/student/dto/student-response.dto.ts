import { PartialType } from '@nestjs/mapped-types';
import { Expose } from 'class-transformer';
import { StudentEntity } from 'src/entities/student.entity';

export class StudentResponse extends PartialType(StudentEntity) {
  @Expose({ name: 'total_points' })
  public totalPoints?: number;

  @Expose({ name: 'violation_count' })
  public totalViolations?: number;
}
