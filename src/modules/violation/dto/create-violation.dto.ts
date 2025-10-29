import { Expose } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateViolationDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @Expose({ name: 'student_ids' })
  public studentIds?: number[];

  @IsOptional()
  @IsNumber()
  @Expose({ name: 'image_id' })
  public imageId?: number | null;

  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @Expose({ name: 'violation_type_ids' })
  public violationTypeIds?: number[];

  @IsOptional()
  @IsString()
  public note?: string;
}
