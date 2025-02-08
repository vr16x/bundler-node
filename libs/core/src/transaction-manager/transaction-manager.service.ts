import { DEFAULT_ENTRYPOINT_ADDRESS, UserOperationStruct } from '@biconomy/account';
import { Injectable, Logger } from '@nestjs/common';
import { Web3ProviderService } from '../web3-provider/web3-provider.service';
import { EntryPointContractService } from '../contracts/entry-point-contract/entry-point-contract.service';
import { RelayerManagerService } from '../relayer-manager/relayer-manager.service';
import { JsonRpcException } from '../common/exception-filters/json-exception-handler.filter';
import { ERROR_CODES } from '../common/error-handler/error-codes';
import { TransactionReceipt, WriteContractErrorType } from 'viem';
import { ENTRY_POINT_CONTRACT_ABI } from '../contracts/entry-point-contract/abi/entry-point-contract-abi';

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
};

@Injectable()
export class TransactionManagerService {

    private readonly logger = new Logger(TransactionManagerService.name);

    constructor(
        private readonly relayerManagerService: RelayerManagerService,
        private readonly entryPointContractService: EntryPointContractService,
        private readonly web3ProviderService: Web3ProviderService
    ) { }

    async sendTransaction(userOperation: UserOperationStruct, userOpHash: string, chainId: number) {
        let relayerId: number = -1;

        // Will be retried for 1 minute and 30 seconds to get a active relayer, else it will fail
        // This implementation was adapted to work with instant execution. If the UserMempool or queues are used
        // for execution of the UserOperation ? It will be executed in the background worker
        let maxTries = new Array(1.5 * 60).fill(0).map((_, index) => index + 1);

        for await (let _tryCount of maxTries) {
            const relayerInfo = this.relayerManagerService.getActiveRelayer();

            if (relayerInfo.isRelayerAvailable) {
                relayerId = relayerInfo.relayerId
                break;
            }

            await delay(1000); // 1 seconds delay
        }

        if (relayerId <= 0) {
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "No active relayer found to process your user operation");
        }

        this.relayerManagerService.consumeRelayer(relayerId, userOperation);

        const relayerWallet = await this.relayerManagerService.getRelayerWalletById(relayerId, chainId);

        const gasPrice = await this.web3ProviderService.getGasFees(chainId);

        const gasLimit = await this.web3ProviderService.estimateGas(
            DEFAULT_ENTRYPOINT_ADDRESS,
            'handleOps',
            ENTRY_POINT_CONTRACT_ABI,
            [[userOperation], relayerWallet.account.address],
            chainId
        );

        const nonce = await relayerWallet.getTransactionCount({
            address: relayerWallet.account.address,
            blockTag: 'pending',
        });

        const bumpedGasLimit = gasLimit * BigInt(120) / BigInt(100);
        const bumpedGasPrice = gasPrice * BigInt(120) / BigInt(100);

        let txHash: `0x${string}` = '0x';

        try {
            txHash = await this.entryPointContractService.handleOps(
                relayerWallet,
                [userOperation],
                relayerWallet.account.address,
                {
                    nonce: nonce,
                    gas: bumpedGasLimit,
                    gasPrice: bumpedGasPrice
                }
            );
        } catch (error) {
            const errorInfo = error as WriteContractErrorType;
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, errorInfo.message);
        }

        let transactionReceipt: TransactionReceipt | null = null;

        try {
            // Default block confirmation is 1, but this can be increased if the UserOperations are
            // stored in the UserOp mempool and executed via queue in the background worker.
            // Increase it here will slow down the API response time 
            transactionReceipt = await relayerWallet.waitForTransactionReceipt({ hash: txHash });
        } catch (error) {
            this.logger.log(`Failed to get transaction receipt for the transaction hash: ${txHash}.`);
        }

        this.relayerManagerService.relieveRelayer(relayerId);

        return {
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
        };
    }
}
