import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { JwtAuthGuard } from 'src/commons/guards/jwt-auth.guard';
import { QueryChartDto } from './dto/query-chart.dto';
import { Payload } from 'src/commons/decorators/payload.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SetRole } from 'src/commons/decorators/role.decorator';
import { RoleEnum } from 'src/commons/enums/role.enum';
import { PermissionGuard } from 'src/commons/guards/permission.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('data')
  getData(
    @Query() dateRange: QueryDateRangeDto,
    @Payload() payload: JwtPayload,
  ) {
    return this.dashboardService.getData(dateRange, Number(payload.school_id));
  }

  @Get('superadmin-data')
  @SetRole(RoleEnum.SUPERADMIN)
  getSuperadminData(@Query() dateRange: QueryDateRangeDto) {
    return this.dashboardService.getSuperadminData(dateRange);
  }

  @Get('chart-data')
  getChartData(@Query() query: QueryChartDto, @Payload() payload: JwtPayload) {
    return this.dashboardService.getChartData(query, Number(payload.school_id));
  }
}
