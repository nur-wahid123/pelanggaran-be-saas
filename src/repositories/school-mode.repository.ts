import { Injectable } from '@nestjs/common';
import { SchoolModeEntity } from 'src/entities/school-mode.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class SchoolModeRepository extends Repository<SchoolModeEntity> {
  constructor(private readonly datasource: DataSource) {
    super(SchoolModeEntity, datasource.createEntityManager());
  }

  async saveMode(mode: SchoolModeEntity): Promise<SchoolModeEntity> {
    return this.save(mode);
  }
}
