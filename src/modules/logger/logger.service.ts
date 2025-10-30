import { Injectable } from '@nestjs/common';
import { LogTypeEnum } from 'src/commons/enums/log-type.enum';
import { Order } from 'src/commons/enums/order.enum';
import { LoggerEntity } from 'src/entities/logger.entity';
import { UserEntity } from 'src/entities/user.entity';
import { ExportViolationResponseDto } from './dto/response/export-violation-response.dto';
import { LoggerRepository } from 'src/repositories/logger.repository';

@Injectable()
export class LoggerService {
  async getExportViolation() {
    const lastData = await this.loggerRepository.findOne({
      where: { logType: LogTypeEnum.EXPORT_VIOLATION_DATA },
      order: { id: Order.DESC },
      select: { id: true, date: true, user: { id: true, name: true } },
      relations: { user: true },
    });

    if (!lastData) {
      const res = new ExportViolationResponseDto();
      res.user = null;
      res.date = null;
      return res;
    }

    const res = new ExportViolationResponseDto();
    res.user = lastData.user;
    res.date = lastData.date;
    return res;
  }

  setExportViolation(userId: number) {
    this.crateLog({
      type: LogTypeEnum.EXPORT_VIOLATION_DATA,
      message: 'Export Violation Data',
      userId,
    });
  }
  constructor(private readonly loggerRepository: LoggerRepository) {}

  crateLog({
    type,
    message,
    userId,
    metadata,
  }: {
    type: LogTypeEnum;
    userId?: number;
    message: string;
    metadata?: object;
  }) {
    const logger = new LoggerEntity();
    logger.logType = type;
    logger.date = new Date();
    logger.message = message;
    if (userId) {
      const user = new UserEntity();
      user.id = userId;
      logger.user = user;
    }
    if (metadata) {
      logger.metadata = metadata;
    }
    this.loggerRepository.saveLogger(logger);
  }
}
