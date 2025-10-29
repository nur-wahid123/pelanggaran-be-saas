import { IsOptional, IsString } from 'class-validator';
import { FilterDto } from 'src/commons/dto/filter.dto';

export class SchoolFilterDto extends FilterDto {
  @IsOptional()
  @IsString()
  isDemo?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  get isDemoBoolean(): boolean | undefined {
    if (this.isDemo === undefined) return undefined;
    if (this.isDemo === 'true') return true;
    if (this.isDemo === 'false') return false;
    return undefined;
  }

  get isActiveBoolean(): boolean | undefined {
    if (this.isActive === undefined) return undefined;
    if (this.isActive === 'true') return true;
    if (this.isActive === 'false') return false;
    return undefined;
  }
}
