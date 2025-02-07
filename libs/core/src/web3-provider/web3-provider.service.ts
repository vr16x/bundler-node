import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcException } from 'src/json-exception-handler.filter';
import { createWalletClient, Hex, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

@Injectable()
export class Web3ProviderService {
    constructor(private readonly configService: ConfigService) {}
    
    getChain(chainId: number) {
        switch (chainId) {
            case 1:
                return sepolia;
            default:
                throw new JsonRpcException(-32601, "Unsupported chain");
        }
    }

    getWalletByPk(privateKey: string, chainId: number) {
          const account = privateKeyToAccount(privateKey as Hex);

          const client = createWalletClient({
            account,
            chain: this.getChain(chainId),
            transport: http()
          }).extend(publicActions);

          return client;
    }

    getSupportedChainIds(): number[] {
        const chainIds = this.configService.get<string>("SUPPORTED_CHAIN_IDS") || '';
        return chainIds.split(',').map((chainId) => Number(chainId));
    }

    isSupportedChain(chainId: number): boolean {
        const chainIds = this.getSupportedChainIds();
        return chainIds.includes(chainId);
    }
}
