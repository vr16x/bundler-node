import { Test, TestingModule } from '@nestjs/testing';
import { RelayerManagerService } from './relayer-manager.service';

describe('RelayerManagerService', () => {
  let service: RelayerManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RelayerManagerService],
    }).compile();

    service = module.get<RelayerManagerService>(RelayerManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
