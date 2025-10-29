import { IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class AdminUpdateSchoolDto {
  @IsOptional()
  @IsString()
  @Expose({ name: 'school_name' })
  public schoolName: string;

  @IsOptional()
  @IsString()
  public address: string;

  @IsOptional()
  @IsString()
  public phone: string;

  @IsOptional()
  @IsString()
  public description: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  public email: string;

  @IsOptional()
  @IsNumber()
  public image: number;
}
