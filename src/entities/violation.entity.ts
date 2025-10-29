import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { StudentEntity } from './student.entity';
import { ViolationTypeEntity } from './violation-type.entity';
import { Expose } from 'class-transformer';
import { UserEntity } from './user.entity';
import { ImageLinks } from './image-links.entity';
import { SchoolEntity } from './school.entity';

@Entity('violations')
export class ViolationEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  public date?: Date;

  @Column({ type: 'text', nullable: true })
  public note?: string;

  @ManyToOne(() => UserEntity, (user) => user.violations)
  public creator?: UserEntity;

  @OneToOne(() => ImageLinks, (image) => image.violation, {
    nullable: true,
  })
  public image?: ImageLinks | null;

  @ManyToMany(() => StudentEntity, (s) => s.violations)
  @JoinTable()
  public students?: StudentEntity[];

  @ManyToMany(() => ViolationTypeEntity, (vt) => vt.violations)
  @JoinTable()
  @Expose({ name: 'violation_types' })
  public violationTypes?: ViolationTypeEntity[];

  @ManyToOne(() => SchoolEntity)
  public school: SchoolEntity;
}
