import { IsEnum, IsNotEmpty } from 'class-validator';
import { ChartType } from 'src/commons/enums/chart-type.enum';

export class QueryChartDto {
  @IsNotEmpty()
  @IsEnum(ChartType)
  type: ChartType;
}
