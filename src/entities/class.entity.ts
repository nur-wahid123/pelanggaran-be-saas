import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { StudentEntity } from './student.entity';
import { SchoolEntity } from './school.entity';

@Entity('classes')
export class ClassEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  public name?: string;

  @OneToMany(() => StudentEntity, (student) => student.studentClass)
  public students?: StudentEntity[];

  @ManyToOne(() => SchoolEntity)
  public school: SchoolEntity;
}
