import { Test, TestingModule } from '@nestjs/testing';
import { SendUserOperationService } from './send-user-operation.service';

describe('SendUserOperationService', () => {
  let service: SendUserOperationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SendUserOperationService],
    }).compile();

    service = module.get<SendUserOperationService>(SendUserOperationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
