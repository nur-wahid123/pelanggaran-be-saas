import { PartialType } from "@nestjs/mapped-types";
import { Expose } from "class-transformer";
import { ClassEntity } from "src/entities/class.entity";

export class ClassEntityViewDto extends PartialType(ClassEntity) {
    @Expose({ name: "total_student" })
    totalStudent: number;
}