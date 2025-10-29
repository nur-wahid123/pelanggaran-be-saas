import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { Expose } from 'class-transformer';
import { ViolationEntity } from './violation.entity';
import { ClassEntity } from './class.entity';
import { SchoolEntity } from './school.entity';

@Entity('students')
export class StudentEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id?: number;

  @Column()
  public name?: string;

  @Column()
  @Expose({ name: 'school_student_id' })
  public schoolStudentId?: string;

  @Column()
  @Expose({ name: 'national_student_id' })
  public nationalStudentId?: string;

  @ManyToMany(() => ViolationEntity, (v) => v.students)
  public violations?: ViolationEntity[];

  @ManyToOne(() => ClassEntity, (c) => c.students)
  @Expose({ name: 'student_class' })
  public studentClass?: ClassEntity;

  @ManyToOne(() => SchoolEntity)
  public school: SchoolEntity;
}
