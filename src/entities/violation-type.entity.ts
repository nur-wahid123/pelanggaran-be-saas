import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { ViolationEntity } from './violation.entity';
import { SchoolEntity } from './school.entity';

@Entity('violation_types')
export class ViolationTypeEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  public name?: string;

  @Column()
  public point?: number;

  @ManyToMany(() => ViolationEntity, (v) => v.violationTypes, { onDelete: "CASCADE" })
  public violations?: ViolationEntity[];

  @ManyToOne(() => SchoolEntity, { onDelete: 'CASCADE' })
  public school: SchoolEntity;

}
