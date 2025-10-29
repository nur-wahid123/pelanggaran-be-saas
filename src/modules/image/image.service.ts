import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UpdateImageDto } from './dto/update-image.dto';
import { MinioService } from '../violation/minio.service';
import { ImageRepository } from 'src/repositories/image.repository';
import { ImageLinkRepository } from 'src/repositories/image-link.repository';

@Injectable()
export class ImageService {
  constructor(
    private readonly imageRepository: ImageRepository,
    private readonly imageLinkRepository: ImageLinkRepository,
    private readonly minio: MinioService,
  ) {}

  async getStream(id: number) {
    const image = await this.imageRepository.findOneBy({ id });
    if (!image) throw new NotFoundException('Image not found');

    const stream = await this.minio.getObjectStream(image.key);
    if (!stream.readable) {
      throw new InternalServerErrorException('Stream not readable');
    }
    return { stream, image };
  }

  async processAndUpload(files: Express.Multer.File[]): Promise<number> {
    return this.imageLinkRepository.processAndUpload(files);
  }

  findAll() {
    return `This action returns all image`;
  }

  async findOne(id: number) {
    try {
      const imageLinks = await this.imageLinkRepository.findOne({
        where: { id },
        relations: { images: true },
        select: { id: true, images: { id: true } },
      });
      if (!imageLinks) {
        throw new NotFoundException('Image not found');
      }
      const imgs = imageLinks.images.map((image) => image.id);
      return imgs;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    }
  }

  update(id: number, updateImageDto: UpdateImageDto) {
    console.log(updateImageDto);
    return `This action updates a #${id} image`;
  }

  async remove(id: number) {
    const imageLink = await this.imageLinkRepository.findOne({
      where: { id },
      relations: { images: true },
    });
    if (!imageLink) {
      throw new NotFoundException('Image not found');
    }
    if (Array.isArray(imageLink.images)) {
      for (const image of imageLink.images) {
        try {
          await this.minio.deleteObject(image.key);
        } catch (e) {
          // Log and continue deleting DB record even if minio deletion fails
          console.error(`Failed to delete object from Minio: ${image.key}`, e);
        }
        await this.imageRepository.delete(image.id);
      }
    }
    await this.imageLinkRepository.delete(id);
    return true;
  }
}
