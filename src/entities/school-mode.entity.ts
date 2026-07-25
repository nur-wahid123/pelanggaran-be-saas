import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { CommonBaseEntity } from './common-base.entity';
import { SchoolEntity } from './school.entity';
import { Expose } from 'class-transformer';

@Entity({ name: 'school_modes' })
export class SchoolModeEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Expose({ name: 'name' })
  public name: string;

  @Column({ type: 'text', nullable: true })
  @Expose({ name: 'description' })
  public description?: string;

  @Column({ type: 'int', default: 0, name: 'students_limit' })
  @Expose({ name: 'students_limit' })
  public studentsLimit: number;

  @Column({ type: 'int', default: 0, name: 'violation_type_limit' })
  @Expose({ name: 'violation_type_limit' })
  public violationTypeLimit: number;

  @Column({ type: 'int', default: 0, name: 'violation_limit' })
  @Expose({ name: 'violation_limit' })
  public violationLimit: number;

  @Column({ type: 'int', default: 0, name: 'classes_limit' })
  @Expose({ name: 'classes_limit' })
  public classesLimit: number;

  @Column({ type: 'int', default: 0, name: 'user_limit' })
  @Expose({ name: 'user_limit' })
  public userLimit: number;

  @Column({ type: 'boolean', default: false, name: 'is_demo' })
  @Expose({ name: 'is_demo' })
  public isDemo: boolean;

  @OneToMany(() => SchoolEntity, (school) => school.mode)
  public schools: SchoolEntity[];
}
