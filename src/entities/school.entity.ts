import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Expose } from 'class-transformer';
import { CommonBaseEntity } from './common-base.entity';
import { ClassEntity } from './class.entity';
import { ViolationEntity } from './violation.entity';
import { ViolationTypeEntity } from './violation-type.entity';
import { UserEntity } from './user.entity';
import { StudentEntity } from './student.entity';
import { SchoolModeEntity } from './school-mode.entity';

export function getSchool(id: number): SchoolEntity {
  const school = new SchoolEntity();
  school.id = id;
  return school;
}

@Entity({ name: 'schools' })
export class SchoolEntity extends CommonBaseEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'boolean', default: true })
  @Expose({ name: 'is_demo' })
  public isDemo: boolean;

  @Column({ type: 'boolean', default: true })
  @Expose({ name: 'is_active' })
  public isActive: boolean;

  @Column({ type: 'varchar', length: 255 })
  @Expose({ name: 'name' })
  public name: string;

  @Column({ type: 'text', nullable: true })
  @Expose({ name: 'address' })
  public address?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Expose({ name: 'phone' })
  public phone?: string;

  @Column({ type: 'text', nullable: true, default: '' })
  @Expose({ name: 'description' })
  public description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Expose({ name: 'email' })
  public email: string;

  @Column({ nullable: true })
  @Expose({ name: 'image' })
  public image?: number;

  @Column({ nullable: true })
  @Expose({ name: 'start_date' })
  public startDate: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  @Expose({ name: 'slug' })
  public slug?: string;

  //limitations

  @Column({ type: 'int', nullable: true })
  @Expose({ name: 'students_limit' })
  public studentsLimit?: number;

  @Column({ type: 'int', nullable: true })
  @Expose({ name: 'violation_type_limit' })
  public violationTypeLimit?: number;

  @Column({ type: 'int', nullable: true })
  @Expose({ name: 'violation_limit' })
  public violationLimit?: number;

  @Column({ type: 'int', nullable: true })
  @Expose({ name: 'classes_limit' })
  public classesLimit?: number;

  @Column({ type: 'int', nullable: true })
  @Expose({ name: 'user_limit' })
  public userLimit?: number;

  //Relations

  @OneToMany(
    () => ClassEntity,
    (classEntity: ClassEntity) => classEntity.school,
  )
  @Expose({ name: 'classes' })
  public classes: ClassEntity[];

  @OneToMany(
    () => StudentEntity,
    (studentEntity: StudentEntity) => studentEntity.school,
  )
  @Expose({ name: 'students' })
  public students: StudentEntity[];

  @OneToMany(() => UserEntity, (userEntity: UserEntity) => userEntity.school)
  @Expose({ name: 'users' })
  public users: UserEntity[];

  @OneToMany(
    () => ViolationEntity,
    (violations: ViolationEntity) => violations.school,
  )
  @Expose({ name: 'violations' })
  public violations: ViolationEntity[];

  @OneToMany(
    () => ViolationTypeEntity,
    (violationType: ViolationTypeEntity) => violationType.school,
  )
  @Expose({ name: 'violation_types' })
  public violationTypes: ViolationTypeEntity[];

  @ManyToOne(() => SchoolModeEntity, (mode) => mode.schools, { nullable: true })
  @JoinColumn({ name: 'mode_id' })
  @Expose({ name: 'mode' })
  public mode?: SchoolModeEntity;

  // effective limits helpers
  getEffectiveStudentsLimit(): number {
    return this.studentsLimit !== null && this.studentsLimit !== undefined
      ? this.studentsLimit
      : (this.mode?.studentsLimit ?? 999999);
  }

  getEffectiveViolationTypeLimit(): number {
    return this.violationTypeLimit !== null && this.violationTypeLimit !== undefined
      ? this.violationTypeLimit
      : (this.mode?.violationTypeLimit ?? 999999);
  }

  getEffectiveViolationLimit(): number {
    return this.violationLimit !== null && this.violationLimit !== undefined
      ? this.violationLimit
      : (this.mode?.violationLimit ?? 999999);
  }

  getEffectiveClassesLimit(): number {
    return this.classesLimit !== null && this.classesLimit !== undefined
      ? this.classesLimit
      : (this.mode?.classesLimit ?? 999999);
  }

  getEffectiveUserLimit(): number {
    return this.userLimit !== null && this.userLimit !== undefined
      ? this.userLimit
      : (this.mode?.userLimit ?? 999999);
  }

  getEffectiveIsDemo(): boolean {
    return this.mode ? this.mode.isDemo : this.isDemo;
  }
}
