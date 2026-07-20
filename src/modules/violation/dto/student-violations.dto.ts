import { IntersectionType, PartialType } from "@nestjs/mapped-types";
import { Expose } from "class-transformer";
import { StudentEntity } from "src/entities/student.entity";

export class AdditionalFields {
    @Expose({ name: "violation_count" })
    public violationCount: number;

    @Expose({ name: "total_points" })
    public totalPoints: number;
}

export class StudentViolationsDto extends (IntersectionType(StudentEntity, AdditionalFields)) { }