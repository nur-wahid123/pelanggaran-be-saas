import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsStrongPassword,
  Matches,
  MinLength,
} from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateSchoolDto {
  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'school_name' })
  public schoolName: string;

  @IsNotEmpty()
  @IsBoolean()
  @Expose({ name: 'is_demo' })
  public isDemo: boolean;

  @IsNotEmpty()
  @IsBoolean()
  @Expose({ name: 'is_active' })
  public isActive: boolean;

  @IsNotEmpty()
  @IsString()
  public address: string;

  @IsNotEmpty()
  @IsString()
  public phone: string;

  @IsNotEmpty()
  @IsString()
  public description: string;

  @IsNotEmpty()
  @IsString()
  @IsEmail()
  public email: string;

  @IsNotEmpty()
  @IsNumber()
  public image: number;

  @IsNotEmpty()
  @IsDate()
  @Expose({ name: 'start_date' })
  public startDate: Date;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'students_limit' })
  public studentLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'violation_limit' })
  public violationLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'classes_limit' })
  public classLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'user_limit' })
  public userLimit: number;

  @IsNotEmpty()
  @IsNumber()
  @Expose({ name: 'violation_type_limit' })
  public violationTypeLimit: number;

  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'user_username' })
  @Matches(/^[a-zA-Z0-9]*$/, {
    message: 'username can only contain alphanumeric characters',
  })
  @MinLength(5, { message: 'Username must have atleast 5 characters.' })
  public userUsername: string;

  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'user_name' })
  public userName: string;

  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'user_email' })
  public userEmail: string;

  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 0,
    minUppercase: 0,
    minNumbers: 0,
    minSymbols: 0,
  })
  @Expose({ name: 'user_password' })
  public userPassword: string;
}
