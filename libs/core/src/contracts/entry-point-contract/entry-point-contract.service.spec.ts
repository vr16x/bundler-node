import { Test, TestingModule } from '@nestjs/testing';
import { EntryPointContractService } from './entry-point-contract.service';

describe('EntryPointContractService', () => {
  let service: EntryPointContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EntryPointContractService],
    }).compile();

    service = module.get<EntryPointContractService>(EntryPointContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
