import { Test, TestingModule } from '@nestjs/testing';
import { RelayerConfigService } from './relayer-config.service';

describe('RelayerConfigService', () => {
  let service: RelayerConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RelayerConfigService],
    }).compile();

    service = module.get<RelayerConfigService>(RelayerConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
