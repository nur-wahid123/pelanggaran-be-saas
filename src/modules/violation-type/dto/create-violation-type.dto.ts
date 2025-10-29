import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateViolationTypeDto {
  @IsNotEmpty()
  @IsString()
  public name?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  public point?: number;
}

export class CreateViolationTypeBatchDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => CreateViolationTypeDto)
  @ValidateNested({ each: true })
  public items?: CreateViolationTypeDto[];
}
