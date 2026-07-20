import { PartialType } from "@nestjs/mapped-types";
import { Expose, Type } from "class-transformer";
import { ViolationTypeEntity } from "src/entities/violation-type.entity";

export class VioltaionTypeDetailDto extends PartialType(ViolationTypeEntity) {
    @Expose({ name: 'total_violated' })
    totalViolated: number;

    @Expose({ name: 'total_student' })
    totalStudent: number;
}