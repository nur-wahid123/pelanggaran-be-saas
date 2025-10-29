import { Test, TestingModule } from '@nestjs/testing';
import { ViolationTypeController } from './violation-type.controller';
import { ViolationTypeService } from './violation-type.service';

describe('ViolationTypeController', () => {
  let controller: ViolationTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViolationTypeController],
      providers: [ViolationTypeService],
    }).compile();

    controller = module.get<ViolationTypeController>(ViolationTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
