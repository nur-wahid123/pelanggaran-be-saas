import { Module } from '@nestjs/common';
import { ImageService } from './image.service';
import { ImageController } from './image.controller';
import { MinioService } from '../violation/minio.service';
import { ImageRepository } from 'src/repositories/image.repository';
import { ImageLinkRepository } from 'src/repositories/image-link.repository';

@Module({
  controllers: [ImageController],
  providers: [ImageService, MinioService, ImageRepository, ImageLinkRepository],
})
export class ImageModule {}
