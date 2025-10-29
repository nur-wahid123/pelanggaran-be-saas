import { Expose } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/commons/dto/filter.dto';

export class QueryViolationTypeDto extends FilterDto {
  @IsOptional()
  @IsString()
  @Expose({ name: 'student_id' })
  studentId: string;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'violation_id' })
  violationId: number;
}
