import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { Expose } from 'class-transformer';
import { ImageLinks } from './image-links.entity';

@Entity('images')
export class ImageEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  @Expose({ name: 'original_name' })
  public originalName?: string;

  @Column()
  public key?: string;

  @Column()
  public mimetype?: string;

  @Column()
  public size?: number;

  @ManyToOne(() => ImageLinks, (imageLinks) => imageLinks.images, {
    nullable: false,
  })
  @Expose({ name: 'image_link' })
  public imageLink?: ImageLinks;
}
