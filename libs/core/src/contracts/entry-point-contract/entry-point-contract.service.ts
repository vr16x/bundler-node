import { DEFAULT_ENTRYPOINT_ADDRESS, UserOperationStruct } from '@biconomy/account';
import { Injectable } from '@nestjs/common';
import { Account, getContract, WalletClient } from 'viem';
import { ENTRY_POINT_CONTRACT_ABI } from './abi/entry-point-contract-abi';

@Injectable()
export class EntryPointContractService {
    getEntryPointContract(walletClient: WalletClient) {
        return getContract({
            address: DEFAULT_ENTRYPOINT_ADDRESS,
            abi: ENTRY_POINT_CONTRACT_ABI,
            client: walletClient
        });
    }

    async handleOps(walletClient: WalletClient, userOperations: UserOperationStruct[], beneficiary: string) {
        // @ts-ignore
        return await walletClient.writeContract({
            address: DEFAULT_ENTRYPOINT_ADDRESS,
            abi: ENTRY_POINT_CONTRACT_ABI,
            functionName: 'handleOps',
            args: [userOperations, beneficiary],
        });
    }
}
