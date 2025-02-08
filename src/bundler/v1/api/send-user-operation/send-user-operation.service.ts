import { Injectable } from '@nestjs/common';
import { RequestInfo } from '../api.service';
import { UserOperationStruct } from '@biconomy/account';
import { TransactionManagerService } from '@packages/core/transaction-manager/transaction-manager.service';

export interface SendUserOperationParams {
    userOperation: UserOperationStruct;
    userOpHash: string;
};

@Injectable()
export class SendUserOperationService {
    constructor(
        private readonly transactionManagerService: TransactionManagerService
    ) {}

    async handle(requestInfo: RequestInfo, chainId: number) {
        const id = requestInfo.id;
        const { userOperation, userOpHash } = (requestInfo.params as unknown) as SendUserOperationParams;

        // ToDo: Params Validation Pending

        const transactionResult = await this.transactionManagerService.sendTransaction(userOperation, userOpHash, chainId);

        return {
            jsonrpc: "2.0",
            result: transactionResult,
            id
        };
    }
}
