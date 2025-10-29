import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFiles,
  UseInterceptors,
  StreamableFile,
} from '@nestjs/common';
import { ImageService } from './image.service';
import { UpdateImageDto } from './dto/update-image.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { NoTransformInterceptor } from 'src/commons/interceptors/no-transform.interceptor';

@Controller('image')
export class ImageController {
  constructor(private readonly imageService: ImageService) {}
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async create(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.imageService.processAndUpload(files);
  }

  @Get('list/:id')
  findAll(@Param('id') id: string) {
    return this.imageService.findOne(+id);
  }

  @Get('get/:imageId')
  @UseInterceptors(NoTransformInterceptor) // custom empty one
  async getImage(@Param('imageId') imageId: string) {
    const { stream, image } = await this.imageService.getStream(+imageId);
    return new StreamableFile(stream, {
      type: image.mimetype,
      disposition: `inline; filename="${image.originalName}"`,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateImageDto: UpdateImageDto) {
    return this.imageService.update(+id, updateImageDto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.imageService.remove(+id);
  }
}
