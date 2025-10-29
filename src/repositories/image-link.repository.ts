import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as sharp from 'sharp';
import { ImageLinks } from 'src/entities/image-links.entity';
import { ImageEntity } from 'src/entities/image.entity';
import { MinioService } from 'src/modules/violation/minio.service';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ImageLinkRepository extends Repository<ImageLinks> {
  async processAndUpload(files: Express.Multer.File[]): Promise<number> {
    const qR = this.datasource.createQueryRunner();
    try {
      await qR.connect();
      await qR.startTransaction();
      const manager = qR.manager;
      // Resize & compress with sharp
      const images: ImageEntity[] = [];
      const imageLink = new ImageLinks();
      await manager.save(imageLink);
      // const maxId = await this.imageLinkRepository.maximum('id');
      for (const file of files) {
        let resized: Buffer;
        try {
          const pipeline = sharp(file.buffer)
            .rotate()
            .resize({ width: 1200, withoutEnlargement: true });

          if (file.mimetype === 'image/png') {
            // Keep transparency
            resized = await pipeline.png({ quality: 75 }).toBuffer();
          } else {
            // Force white background for jpeg
            resized = await pipeline
              .flatten({ background: '#ffffff' })
              .jpeg({ quality: 75 })
              .toBuffer();
          }
        } catch (e) {
          console.log(e);
        }

        const key = `${Date.now()}-${randomUUID()}.${file.mimetype.split('/')[1]}`;

        await this.minio.uploadBuffer(key, resized, file.mimetype);

        const img = manager.create(ImageEntity, {
          originalName: file.originalname,
          key,
          mimetype: file.mimetype,
          size: resized.length,
          imageLink,
        });
        // const savedImage = await manager.save(img);

        images.push(img);
      }
      await manager.save(images);
      await qR.commitTransaction();
      return imageLink.id;
    } catch (error) {
      console.log(error);
      await qR.rollbackTransaction();
      throw new InternalServerErrorException('internal server error');
    } finally {
      await qR.release();
    }
  }
  constructor(
    private readonly datasource: DataSource,
    private readonly minio: MinioService,
  ) {
    super(ImageLinks, datasource.createEntityManager());
  }

  async saveImageLink(images: ImageLinks) {
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
  async saveImageLinks(images: ImageLinks[]) {
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
