import { Test, TestingModule } from '@nestjs/testing';
import { ViolationTypeService } from './violation-type.service';

describe('ViolationTypeService', () => {
  let service: ViolationTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ViolationTypeService],
    }).compile();

    service = module.get<ViolationTypeService>(ViolationTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
