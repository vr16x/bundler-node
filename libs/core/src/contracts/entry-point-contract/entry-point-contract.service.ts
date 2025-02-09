import { DEFAULT_ENTRYPOINT_ADDRESS, UserOperationStruct } from '@biconomy/account';
import { Injectable } from '@nestjs/common';
import { Account, getContract, WalletClient } from 'viem';
import { ENTRY_POINT_CONTRACT_ABI } from './abi/entry-point-contract-abi';

export interface TransactionOptions {
    gas?: bigint;
    gasPrice?: bigint;
    nonce?: number;
}

@Injectable()
export class EntryPointContractService {
    getEntryPointContract(walletClient: WalletClient) {
        return getContract({
            address: DEFAULT_ENTRYPOINT_ADDRESS,
            abi: ENTRY_POINT_CONTRACT_ABI,
            client: walletClient
        });
    }

    async handleOps(walletClient: WalletClient, userOperations: UserOperationStruct[], beneficiary: string, transactionOptions: TransactionOptions = {}) {
        // @ts-ignore
        return await walletClient.writeContract({
            address: DEFAULT_ENTRYPOINT_ADDRESS,
            abi: ENTRY_POINT_CONTRACT_ABI,
            functionName: 'handleOps',
            args: [userOperations, beneficiary],
            nonce: transactionOptions.nonce || undefined,
            gas: transactionOptions.gas || undefined,
            gasPrice: transactionOptions.gasPrice || undefined,
        });
    }
}
