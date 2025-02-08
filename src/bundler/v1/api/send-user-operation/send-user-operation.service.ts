import { Injectable, Logger } from '@nestjs/common';
import { RelayerManagerService } from '@packages/core/relayer-manager/relayer-manager.service';
import { RequestInfo } from '../api.service';
import { EntryPointContractService } from '@packages/core/contracts/entry-point-contract/entry-point-contract.service';
import { UserOperationStruct } from '@biconomy/account';
import { Web3ProviderService } from '@packages/core/web3-provider/web3-provider.service';
import { TransactionReceipt } from 'viem';

export interface SendUserOperationParams {
    userOperation: UserOperationStruct;
    userOpHash: string;
};

@Injectable()
export class SendUserOperationService {
    
    private readonly logger = new Logger(SendUserOperationService.name);

    constructor(
        private readonly relayerManagerService: RelayerManagerService,
        private readonly entryPointContractService: EntryPointContractService,
        private readonly web3ProviderService: Web3ProviderService
    ) { }

    async handle(requestInfo: RequestInfo, chainId: number) {
        const relayerWallet = await this.relayerManagerService.getRelayerWalletById(1, chainId);
        const id = requestInfo.id;
        const { userOperation, userOpHash } = (requestInfo.params as unknown) as SendUserOperationParams;

        // ToDo: Params Validation Pending

        const txHash = await this.entryPointContractService
            .handleOps(relayerWallet, [userOperation], relayerWallet.account.address);

        let transactionReceipt: TransactionReceipt | null = null;

        try {
            // Default block confirmation is 1, but this can be increased if the UserOperations are
            // stored in the UserOp mempool and executed via queue in the background worker.
            // Increase it here will slow down the API response time 
            transactionReceipt = await relayerWallet.waitForTransactionReceipt({ hash: txHash });
        } catch (error) {
            this.logger.log(`Failed to get transaction receipt for the transaction hash: ${txHash}.`);
        }

        return {
            jsonrpc: "2.0",
            result: {
                transactionHash: txHash,
                // JSON cannot stringify the bigint values. So the bigint values are being converted to strings
                // If transactionReceipt is not retrieved, the client can retry with the transaction hash
                transactionReceipt: transactionReceipt ? 
                    JSON.stringify(
                        transactionReceipt,
                        (_key, value) => typeof value === "bigint" ? String(value) : value
                    ) : null,
                explorerLink: `${this.web3ProviderService.getExplorerLinkByChainId(chainId)}/tx/${txHash}`,
                userOpHash
            },
            id
        };
    }
}
