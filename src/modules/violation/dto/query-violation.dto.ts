import { Expose } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { FilterDto } from 'src/commons/dto/filter.dto';
import { ViolationTypeEnum } from 'src/commons/enums/violation-type.enum';

export class QueryViolationDto extends FilterDto {
  @IsNotEmpty()
  @IsEnum(ViolationTypeEnum)
  type: ViolationTypeEnum;

  @IsOptional()
  @IsString()
  @Expose({ name: 'student_id' })
  studentId: string;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'violation_type_id' })
  violationTypeId: number;
}
