import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SchoolModeRepository } from 'src/repositories/school-mode.repository';
import { SchoolModeEntity } from 'src/entities/school-mode.entity';
import { SchoolEntity } from 'src/entities/school.entity';
import { CreateSchoolModeDto } from './dto/create-school-mode.dto';
import { UpdateSchoolModeDto } from './dto/update-school-mode.dto';

@Injectable()
export class SchoolModeService {
  constructor(private readonly schoolModeRepository: SchoolModeRepository) {}

  async findAll() {
    return this.schoolModeRepository.find({
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const mode = await this.schoolModeRepository.findOne({
      where: { id },
    });
    if (!mode) {
      throw new NotFoundException('School mode not found');
    }
    return mode;
  }

  async create(dto: CreateSchoolModeDto, userId: number) {
    const existing = await this.schoolModeRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException('School mode name already exists');
    }

    const mode = new SchoolModeEntity();
    mode.name = dto.name;
    mode.description = dto.description;
    mode.studentsLimit = dto.studentsLimit ?? 0;
    mode.violationTypeLimit = dto.violationTypeLimit ?? 0;
    mode.violationLimit = dto.violationLimit ?? 0;
    mode.classesLimit = dto.classesLimit ?? 0;
    mode.userLimit = dto.userLimit ?? 0;
    mode.isDemo = dto.isDemo ?? false;
    mode.createdBy = userId;

    return this.schoolModeRepository.saveMode(mode);
  }

  async update(id: number, dto: UpdateSchoolModeDto, userId: number) {
    const mode = await this.findOne(id);

    if (dto.name && dto.name !== mode.name) {
      const existing = await this.schoolModeRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new BadRequestException('School mode name already exists');
      }
      mode.name = dto.name;
    }

    if (dto.description !== undefined) mode.description = dto.description;
    if (dto.studentsLimit !== undefined) mode.studentsLimit = dto.studentsLimit;
    if (dto.violationTypeLimit !== undefined) mode.violationTypeLimit = dto.violationTypeLimit;
    if (dto.violationLimit !== undefined) mode.violationLimit = dto.violationLimit;
    if (dto.classesLimit !== undefined) mode.classesLimit = dto.classesLimit;
    if (dto.userLimit !== undefined) mode.userLimit = dto.userLimit;
    if (dto.isDemo !== undefined) mode.isDemo = dto.isDemo;
    mode.updatedBy = userId;

    return this.schoolModeRepository.saveMode(mode);
  }

  async remove(id: number) {
    await this.findOne(id);

    const schoolCount = await this.schoolModeRepository.manager.count(SchoolEntity, {
      where: { mode: { id } },
    });
    if (schoolCount > 0) {
      throw new BadRequestException(
        'Cannot delete school mode because it is assigned to one or more schools.',
      );
    }

    await this.schoolModeRepository.delete(id);
    return { message: 'School mode deleted successfully' };
  }
}
