import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ImageEntity } from 'src/entities/image.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ImageRepository extends Repository<ImageEntity> {
  constructor(private readonly datasource: DataSource) {
    super(ImageEntity, datasource.createEntityManager());
  }
  async saveImage(images: ImageEntity) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      await queryRunner.manager.save(images);
      await queryRunner.commitTransaction();
      return images;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }
  async saveImages(images: ImageEntity[]) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.startTransaction();
      await queryRunner.manager.save(images);
      await queryRunner.commitTransaction();
      return images;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    } finally {
      await queryRunner.release();
    }
  }
}
