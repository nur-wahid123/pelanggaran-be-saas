import { Expose } from 'class-transformer';
import { ViolationEntity } from 'src/entities/violation.entity';

export class ViolationResponseDto extends ViolationEntity {
  constructor(violation: ViolationEntity) {
    super();
    Object.assign(this, violation);
  }

  @Expose({ name: 'images' })
  public images?: number[];
}
