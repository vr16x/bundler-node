import { DEFAULT_ENTRYPOINT_ADDRESS, UserOperationStruct } from '@biconomy/account';
import { Injectable, Logger } from '@nestjs/common';
import { Web3ProviderService } from '../web3-provider/web3-provider.service';
import { EntryPointContractService } from '../contracts/entry-point-contract/entry-point-contract.service';
import { RelayerManagerService } from '../relayer-manager/relayer-manager.service';
import { JsonRpcException } from '../common/exception-filters/json-exception-handler.filter';
import { ERROR_CODES } from '../common/error-handler/error-codes';
import { EstimateContractGasErrorType, TransactionReceipt, WriteContractErrorType } from 'viem';
import { ENTRY_POINT_CONTRACT_ABI } from '../contracts/entry-point-contract/abi/entry-point-contract-abi';

export type TransactionExecutionType = 'send' | 'resend';

export interface ExecuteTransactionResponse {
    transactionHash: string;
    transactionReceipt: string | null;
    explorerLink: string;
    userOpHash: string;
}

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
        // for execution of the UserOperation ? It will be executed in the background worker and no failure will be
        // enforced like this
        let maxTries = new Array(60).fill(0);

        for await (let _ of maxTries) {
            // Get the relayer wallet which is free for executing the user operation for the respective chainId
            const relayerInfo = await this.relayerManagerService.getActiveRelayer(chainId);

            if (relayerInfo.isRelayerAvailable) {
                relayerId = relayerInfo.relayerId
                break;
            }

            await delay(1500); // 1.5 seconds delay
        }

        if (relayerId <= 0) {
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "No active relayer found to process your user operation");
        }

        // This code will allocate the relayer for this user operation execution based on chain id
        this.relayerManagerService.consumeRelayer(relayerId, userOperation, chainId);

        this.logger.log(`Relayer (#${relayerId}) is selected to execute the user operation (${userOpHash}) on the chain ${chainId}`);

        let result: ExecuteTransactionResponse | null = null;

        try {
            // Transaction execution is carried out here with retry mechanism
            result = await this.executeTransaction(relayerId, userOperation, userOpHash, chainId, 'send');
        } catch (error) {
            // If the transaction execution fails, relieve the relayer for the next user operations

            // This code will deallocate the relayer on the respective chain id
            this.relayerManagerService.relieveRelayer(relayerId, chainId);

            throw new JsonRpcException(ERROR_CODES.TRANSACTION_REVERTED, error.message);
        }

        // This code will deallocate the relayer on the respective chain id
        this.relayerManagerService.relieveRelayer(relayerId, chainId);

        this.logger.log(`Selected relayer (#${relayerId}) executed the user operation (${userOpHash}) on the chain ${chainId}`);

        return result as ExecuteTransactionResponse;
    }

    async executeTransaction(
        relayerId: number,
        userOperation: UserOperationStruct,
        userOpHash: string, chainId: number,
        transactionExecutionType: TransactionExecutionType = 'send'
    ): Promise<ExecuteTransactionResponse> {
        const relayerWallet = await this.relayerManagerService.getRelayerWalletById(relayerId, chainId);

        // On transaction retry, the gas and fees are bumped to 45% to increase the success rate
        // These values can be increased individually instead of altogether but this results in more retries in terms of
        // failures and this is not good for transactions executing without mempool or queue. So this is done for simplicity 
        const bumpPercentage = transactionExecutionType === 'send' ? 15 : 45;

        let txHash: `0x${string}` = '0x';

        const nonce = await this.relayerManagerService.getRelayerNonce(relayerId, chainId);

        try {
            // Gas price is bumped to increase the success rate, if there is no enough gas the transaction might delay its execution
            // or the transaction may be stuck which needs to be cancelled manually via cron jobs or some sort of automation.
            // For simplicity, to execute instant execution without UserOp mempool, always bumping gas increase success rate.
            const bumpedGasPrice = await this.getBumpedGasPrice(bumpPercentage, chainId);
            const bumpedGasLimit = await this.getBumpedGasLimit(userOperation, relayerWallet.account.address, bumpPercentage, chainId);
            
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
            const errorMessage = errorInfo?.message?.split('\n')?.[0] || errorInfo?.message;

            // If the transaction execution type is send, there will be one transaction retry with increased gas 
            // and gas limit with latest nonce
            if (transactionExecutionType === 'send') {
                if (this.isNonceTooLowError(errorMessage) || this.isGasLimitTooLowError(errorMessage)) {
                    this.logger.log(`User operation (${userOpHash}) failed due to the error (${errorMessage}) on the chain ${chainId}, transaction retry initiated`);

                    // Transaction is being retried here and return the result
                    return await this.executeTransaction(relayerId, userOperation, userOpHash, chainId, 'resend');
                } else {
                    throw new JsonRpcException(ERROR_CODES.TRANSACTION_REVERTED, errorMessage);
                }
            } else {
                throw new JsonRpcException(ERROR_CODES.TRANSACTION_REVERTED, errorMessage);
            }
        }

        let transactionReceipt: TransactionReceipt | null = null;

        try {
            // Default block confirmation is 1, but this can be increased if the UserOperations are
            // stored in the UserOp mempool and executed via queue in the background worker.
            // Increasing it here will slow down the API response time
            transactionReceipt = await relayerWallet.waitForTransactionReceipt({ hash: txHash });
        } catch (error) {
            this.logger.log(`Failed to get transaction receipt for the transaction hash: ${txHash} on the chain ${chainId}`);
        }

        // Mark the current nonce as used and increment the nonce
        this.relayerManagerService.markRelayerNonce(relayerId, nonce, chainId);

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

    async getBumpedGasPrice(percentage: number, chainId: number) {
        const gasPrice = await this.web3ProviderService.getGasFees(chainId);

        // Increased Gas price for high success rate
        const bumpedGasPrice = gasPrice * BigInt(100 + percentage) / BigInt(100);
        return bumpedGasPrice;
    }

    async getBumpedGasLimit(userOperation: UserOperationStruct, walletAddress: `0x${string}`, percentage: number, chainId: number) {
        try {
            const gasLimit = await this.web3ProviderService.estimateGas(
                DEFAULT_ENTRYPOINT_ADDRESS,
                'handleOps',
                ENTRY_POINT_CONTRACT_ABI,
                [[userOperation], walletAddress],
                chainId
            );
    
            // Increased Gas limit for high success rate
            const bumpedGasLimit = gasLimit * BigInt(100 + percentage) / BigInt(100);
            return bumpedGasLimit;
        } catch (error) {
            const errorInfo = error as EstimateContractGasErrorType;
            const errorMessage = errorInfo?.message?.split('\n')?.[0] || errorInfo?.message;

            throw new JsonRpcException(ERROR_CODES.TRANSACTION_REVERTED, errorMessage);
        }
    }

    isNonceTooLowError(errorMessage: string) {
        const regex = /Nonce provided for the transaction \((\d+)\) is lower than the current nonce of the account\./;
        const match = errorMessage.match(regex);

        return !!match;
    }

    isGasLimitTooLowError(errorMessage: string) {
        const regex = /The amount of gas \((\d+)\) provided for the transaction is too low./;
        const match = errorMessage.match(regex);

        return !!match;
    }
}

const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
};