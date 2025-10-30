import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  private readonly client: S3Client;
  private readonly bucket = process.env.MINIO_BUCKET;
  private readonly logger = new Logger(MinioService.name);
  constructor() {
    this.client = new S3Client({
      region: process.env.MINIO_REGION || 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
      },
      forcePathStyle: process.env.MINIO_FORCE_PATH_STYLE === 'true',
    });
  }
  async uploadBuffer(key: string, buffer: Buffer, contentType: string) {
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      await this.client.send(cmd);
      return { key };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('internal server error');
    }
  }
  async getObjectStream(key: string): Promise<Readable> {
    try {
      const cmd = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const res = await this.client.send(cmd);

      // If Body is already Node.js Readable
      if (res.Body instanceof Readable) {
        return res.Body;
      }

      // If Body is a web stream (ReadableStream)
      if (res.Body && typeof (res.Body as any).getReader === 'function') {
        return Readable.fromWeb(res.Body as any);
      }

      throw new Error('Unsupported stream type from MinIO');
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async deleteObject(key: string) {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(cmd);
  }
}
