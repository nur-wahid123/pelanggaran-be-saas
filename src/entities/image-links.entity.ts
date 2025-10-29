import {
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { ImageEntity } from './image.entity';
import { ViolationEntity } from './violation.entity';

@Entity('image_links')
export class ImageLinks extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @OneToMany(() => ImageEntity, (image) => image.imageLink, {
    nullable: false,
  })
  @JoinColumn({ name: 'image_id' })
  images: ImageEntity[];

  @OneToOne(() => ViolationEntity, (violation) => violation.image, {
    nullable: true,
  })
  @JoinColumn({ name: 'violation_id' })
  violation: ViolationEntity | null;
}
