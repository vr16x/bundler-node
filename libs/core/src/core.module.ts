import { Module } from '@nestjs/common';
import { Web3ProviderService } from './web3-provider/web3-provider.service';
import { RelayerManagerService } from './relayer-manager/relayer-manager.service';
import { ConfigModule } from '@nestjs/config';
import { RelayerConfigService } from './config/relayer/relayer-config.service';
import { EntryPointContractService } from './contracts/entry-point-contract/entry-point-contract.service';
import { TransactionManagerService } from './transaction-manager/transaction-manager.service';

const sharedProviders = [
  Web3ProviderService,
  RelayerManagerService,
  EntryPointContractService,
  TransactionManagerService
];

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [...sharedProviders, RelayerConfigService],
  exports: [...sharedProviders],
})
export class CoreModule {}
