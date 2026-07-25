import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Expose } from 'class-transformer';

export class UpdateSchoolModeDto {
  @IsOptional()
  @IsString()
  public name?: string;

  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'students_limit' })
  public studentsLimit?: number;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'violation_type_limit' })
  public violationTypeLimit?: number;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'violation_limit' })
  public violationLimit?: number;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'classes_limit' })
  public classesLimit?: number;

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'user_limit' })
  public userLimit?: number;

  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'is_demo' })
  public isDemo?: boolean;
}
