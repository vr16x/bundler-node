import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonRpcException } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { createPublicClient, createWalletClient, formatEther, Hex, http, publicActions } from 'viem';
import { privateKeyToAccount, privateKeyToAddress } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { ERROR_CODES } from '../common/error-handler/error-codes';

@Injectable()
export class Web3ProviderService {
    constructor(private readonly configService: ConfigService) {}

    getChainNameByChainId(chainId: number) {
        switch (chainId) {
            case 11155111:
                return "SEPOLIA";
            default:
                throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Unsupported chain");
        }
    }

    getExplorerLinkByChainId(chainId: number) {
        switch (chainId) {
            case 11155111:
                return this.configService.get<string>(`${this.getChainNameByChainId(chainId)}_EXPLORER_URL`);
            default:
                throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Unsupported chain");
        }
    }

    getChainRpcUrl(chainId: number) {
        switch (chainId) {
            case 11155111:
                return this.configService
                    .get<string>(`${this.getChainNameByChainId(chainId)}_RPC_URL`);
            default:
                throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Unsupported chain");
        }
    }

    getChain(chainId: number) {
        switch (chainId) {
            case 11155111:
                return sepolia;
            default:
                throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Unsupported chain");
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

    getPublicClient(chainId: number) {
        return createPublicClient({
            chain: this.getChain(chainId),
            transport: http(this.getChainRpcUrl(chainId))
        });
    }

    getSupportedChainIds(): number[] {
        const chainIds = this.configService.get<string>("SUPPORTED_CHAIN_IDS") || '';
        return chainIds.split(',').map((chainId) => Number(chainId));
    }

    isSupportedChain(chainId: number): boolean {
        const chainIds = this.getSupportedChainIds();
        return chainIds.includes(chainId);
    }

    async getBalanceByPk(privateKey: string, chainId: number){
        const balanceInWei =  await this.getPublicClient(chainId)
            .getBalance({ address: privateKeyToAddress(privateKey as Hex) });
        return Number(formatEther(balanceInWei));
    }

    async estimateGas(address: `0x${string}`, functionName: string, abi: unknown[], args: unknown[], chainId: number) {
        return await this.getPublicClient(chainId).estimateContractGas({
            address,
            abi,
            functionName,
            args: args,
        });
    }

    async getGasFees(chainId: number) {
        return await this.getPublicClient(chainId).getGasPrice();
    }

    async getNonce(walletAddress: `0x${string}`, chainId: number) {
        return await this.getPublicClient(chainId).getTransactionCount({
            address: walletAddress,
            blockTag: 'pending',
        });
    }
}
