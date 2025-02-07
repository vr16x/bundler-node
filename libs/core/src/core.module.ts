import { Module } from '@nestjs/common';
import { Web3ProviderService } from './web3-provider/web3-provider.service';
import { RelayerManagerService } from './relayer-manager/relayer-manager.service';
import { ConfigModule } from '@nestjs/config';
import { RelayerConfigService } from './config/relayer/relayer-config.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [Web3ProviderService, RelayerManagerService, RelayerConfigService],
  exports: [Web3ProviderService, RelayerManagerService],
})
export class CoreModule {}
