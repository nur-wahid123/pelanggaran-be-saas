import { SchoolEntity } from 'src/entities/school.entity';
import { DataSource, Repository } from 'typeorm';
import {
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import { UserEntity } from 'src/entities/user.entity';
import { UpdateSchoolDto } from 'src/modules/school/dto/update-school.dto';
import { SchoolFilterDto } from 'src/modules/school/dto/school-filter.dto';
import { PageOptionsDto } from 'src/commons/dto/page-option.dto';
import { QueryDateRangeDto } from 'src/commons/dto/query-daterange.dto';
import { PageDto } from 'src/commons/dto/page.dto';
import { PageMetaDto } from 'src/commons/dto/page-meta.dto';
import { AdminUpdateSchoolDto } from 'src/modules/school/dto/admin-update-school.dto';
@Injectable()
export class SchoolRepository extends Repository<SchoolEntity> {
  constructor(private readonly datasource: DataSource) {
    super(SchoolEntity, datasource.createEntityManager());
  }

  async findAll(
    filter: SchoolFilterDto,
    pageOptionsDto: PageOptionsDto,
    dateRange: QueryDateRangeDto,
  ) {
    const qb = this.createQueryBuilder('school').select([
      'school.id',
      'school.name',
      'school.isActive',
      'school.address',
      'school.phone',
      'school.description',
      'school.email',
      'school.image',
      'school.startDate',
      'school.studentsLimit',
      'school.violationTypeLimit',
      'school.classesLimit',
      'school.userLimit',
      'school.isDemo',
    ]);

    // Search by name
    if (filter.search) {
      qb.andWhere('school.name ILIKE :search', {
        search: `%${filter.search}%`,
      });
    }

    // Filter by isActive (convert string to boolean if needed)
    if (filter.isActiveBoolean !== undefined) {
      qb.andWhere('school.isActive = :isActive', {
        isActive: filter.isActiveBoolean,
      });
    }

    // Filter by isDemo (convert string to boolean if needed)
    if (filter.isDemoBoolean !== undefined) {
      qb.andWhere('school.isDemo = :isDemo', { isDemo: filter.isDemoBoolean });
    }

    // Filter by code if provided
    if (filter.code) {
      qb.andWhere('school.code = :code', { code: filter.code });
    }

    // Filter by date range only if both startDate and finishDate are provided
    if (dateRange?.startDate && dateRange?.finishDate) {
      qb.andWhere('school.startDate BETWEEN :from AND :to', {
        from: dateRange.startDate,
        to: dateRange.finishDate,
      });
    }

    // Pagination
    if (pageOptionsDto?.take) {
      qb.take(pageOptionsDto.take);
    }
    if (pageOptionsDto?.skip) {
      qb.skip(pageOptionsDto.skip);
    }

    qb.orderBy('school.id', 'DESC');
    const [data, itemCount] = await qb.getManyAndCount();
    const meta = new PageMetaDto({ pageOptionsDto, itemCount });

    return new PageDto(data, meta);
  }

  async saveSchool(school: SchoolEntity, user: UserEntity) {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();

      // Check for duplicate school name (not deleted)
      const existingSchool = await qR.manager.findOne(SchoolEntity, {
        where: { name: school.name, deletedAt: null },
      });
      if (existingSchool) {
        throw new BadRequestException('School with this name already exists');
      }

      // Check for duplicate user username or email (not deleted)
      const existingUser = await qR.manager.findOne(UserEntity, {
        where: [
          { username: user.username, deletedAt: null },
          { email: user.email, deletedAt: null },
        ],
      });

      // If not found, check for deleted user with same username and email
      let userToSave: UserEntity;
      if (!existingUser) {
        // Check for deleted user with same username and email
        const deletedUser = await qR.manager.findOne(UserEntity, {
          where: [
            {
              username: user.username,
              email: user.email,
            },
          ],
          withDeleted: true,
        });
        if (deletedUser) {
          // Reactivate and update the deleted user
          deletedUser.deletedAt = null;
          deletedUser.deletedBy = null;
          deletedUser.name = user.name;
          deletedUser.password = user.password;
          deletedUser.role = user.role;
          deletedUser.school = school;
          deletedUser.createdBy = user.createdBy;
          deletedUser.email = user.email;
          deletedUser.username = user.username;
          userToSave = deletedUser;
        } else {
          userToSave = user;
        }
      } else {
        throw new BadRequestException(
          'User with this username or email already exists',
        );
      }

      await qR.manager.save(school);
      userToSave.school = school;
      await qR.manager.save(userToSave);

      await qR.commitTransaction();
      return school;
    } catch (error) {
      await qR.rollbackTransaction();
      console.log(error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Internal Server Error');
    } finally {
      await qR.release();
    }
  }

  async updateSchool(
    id: number,
    updateSchoolDto: UpdateSchoolDto,
    userId: number,
  ) {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();

      const school = await qR.manager.findOne(SchoolEntity, {
        where: { id, deletedAt: null },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Check for duplicate school name (not deleted, not self)
      if (
        updateSchoolDto.schoolName &&
        updateSchoolDto.schoolName !== school.name
      ) {
        const duplicateSchool = await qR.manager.findOne(SchoolEntity, {
          where: { name: updateSchoolDto.schoolName, deletedAt: null },
        });
        if (duplicateSchool && duplicateSchool.id !== id) {
          throw new BadRequestException('School with this name already exists');
        }
      }

      // Update school fields
      // Only update allowed fields
      if (updateSchoolDto.schoolName) school.name = updateSchoolDto.schoolName;
      if (updateSchoolDto.address !== undefined)
        school.address = updateSchoolDto.address;
      if (updateSchoolDto.phone !== undefined)
        school.phone = updateSchoolDto.phone;
      if (updateSchoolDto.description !== undefined)
        school.description = updateSchoolDto.description;
      if (updateSchoolDto.email !== undefined)
        school.email = updateSchoolDto.email;
      if (updateSchoolDto.image !== undefined)
        school.image = updateSchoolDto.image;
      if (updateSchoolDto.isActive !== undefined)
        school.isActive = updateSchoolDto.isActive;
      if (updateSchoolDto.isDemo !== undefined)
        school.isDemo = updateSchoolDto.isDemo;
      if (updateSchoolDto.studentLimit !== undefined)
        school.studentsLimit = updateSchoolDto.studentLimit;
      if (updateSchoolDto.violationLimit !== undefined)
        school.violationLimit = updateSchoolDto.violationLimit;
      if (updateSchoolDto.classLimit !== undefined)
        school.classesLimit = updateSchoolDto.classLimit;
      if (updateSchoolDto.userLimit !== undefined)
        school.userLimit = updateSchoolDto.userLimit;
      if (updateSchoolDto.violationTypeLimit !== undefined)
        school.violationTypeLimit = updateSchoolDto.violationTypeLimit;

      school.updatedBy = userId;
      await qR.manager.save(school);

      await qR.commitTransaction();
      return school;
    } catch (error) {
      await qR.rollbackTransaction();
      console.log(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Internal Server Error');
    } finally {
      await qR.release();
    }
  }

  async updateSchoolAdmin(
    id: number,
    updateSchoolDto: AdminUpdateSchoolDto,
    userId: number,
  ) {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();

      const school = await qR.manager.findOne(SchoolEntity, {
        where: { id, deletedAt: null },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Check for duplicate school name (not deleted, not self)
      if (
        updateSchoolDto.schoolName &&
        updateSchoolDto.schoolName !== school.name
      ) {
        const duplicateSchool = await qR.manager.findOne(SchoolEntity, {
          where: { name: updateSchoolDto.schoolName, deletedAt: null },
        });
        if (duplicateSchool && duplicateSchool.id !== id) {
          throw new BadRequestException('School with this name already exists');
        }
      }

      // Update school fields
      // Only update allowed fields
      if (updateSchoolDto.schoolName) school.name = updateSchoolDto.schoolName;
      if (updateSchoolDto.address !== undefined)
        school.address = updateSchoolDto.address;
      if (updateSchoolDto.phone !== undefined)
        school.phone = updateSchoolDto.phone;
      if (updateSchoolDto.description !== undefined)
        school.description = updateSchoolDto.description;
      if (updateSchoolDto.email !== undefined)
        school.email = updateSchoolDto.email;
      if (updateSchoolDto.image !== undefined)
        school.image = updateSchoolDto.image;

      school.updatedBy = userId;
      await qR.manager.save(school);

      await qR.commitTransaction();
      return school;
    } catch (error) {
      await qR.rollbackTransaction();
      console.log(error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      )
        throw error;
      throw new InternalServerErrorException('Internal Server Error');
    } finally {
      await qR.release();
    }
  }

  async deleteSchool(id: number, userId: number) {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();

      const school = await qR.manager.findOne(SchoolEntity, {
        where: { id, deletedAt: null },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }
      school.deletedAt = new Date();
      school.deletedBy = userId;
      await qR.manager.save(school);

      // Soft delete all users of this school
      const users = await qR.manager.find(UserEntity, {
        where: { school: { id }, deletedAt: null },
      });
      for (const user of users) {
        user.deletedAt = new Date();
        user.deletedBy = userId;
        await qR.manager.save(user);
      }

      await qR.commitTransaction();
      return { deleted: true };
    } catch (error) {
      await qR.rollbackTransaction();
      console.log(error);
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Internal Server Error');
    } finally {
      await qR.release();
    }
  }
}
