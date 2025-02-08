import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcException } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { createWalletClient, Hex, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { ERROR_CODES } from '../common/error-handler/error-codes';

@Injectable()
export class Web3ProviderService {
    constructor(private readonly configService: ConfigService) {}

    getChainNameByChainId(chainId: number) {
        switch(chainId) {
            case 11155111:
                return "SEPOLIA";
            default:
                throw new JsonRpcException(ERROR_CODES.METHOD_NOT_FOUND, "Unsupported chain");
        }
    }

    getExplorerLinkByChainId(chainId: number) {
        switch(chainId) {
            case 11155111:
                return this.configService.get<string>(`${this.getChainNameByChainId(chainId)}_EXPLORER_URL`);
            default:
                throw new JsonRpcException(ERROR_CODES.METHOD_NOT_FOUND, "Unsupported chain");
        }
    }

    getChainRpcUrl(chainId: number) {
        switch (chainId) {
            case 11155111:
                return this.configService
                    .get<string>(`${this.getChainNameByChainId(chainId)}_RPC_URL`);
            default:
                throw new JsonRpcException(ERROR_CODES.METHOD_NOT_FOUND, "Unsupported chain");
        }
    }

    getChain(chainId: number) {
        switch (chainId) {
            case 11155111:
                return sepolia;
            default:
                throw new JsonRpcException(ERROR_CODES.METHOD_NOT_FOUND, "Unsupported chain");
        }
    }

    getWalletByPk(privateKey: string, chainId: number) {
          const account = privateKeyToAccount(privateKey as Hex);

          const client = createWalletClient({
            account,
            chain: this.getChain(chainId),
            transport: http(this.getChainRpcUrl(chainId))
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
