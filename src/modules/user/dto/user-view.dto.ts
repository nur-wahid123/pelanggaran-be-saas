import { PartialType } from "@nestjs/mapped-types";
import { Expose } from "class-transformer";
import { UserEntity } from "src/entities/user.entity";

export class UserViewDto extends PartialType(UserEntity) {
    @Expose({ name: "total_violation" })
    totalViolation: number
}