import { Injectable } from '@nestjs/common';
import { RequestInfo } from '../api.service';
import { UserOperationStruct } from '@biconomy/account';
import { isAddress, isHex } from 'viem';
import { TransactionManagerService } from '@packages/core/transaction-manager/transaction-manager.service';
import { JsonRpcException } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { ERROR_CODES } from '@packages/core/common/error-handler/error-codes';

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

        if (!this.isValidUserOperation(userOperation)) {
            throw new JsonRpcException(ERROR_CODES.INVALID_METHOD_PARAMS, "Invalid user operation");
        }

        if (!isHex(userOpHash)) {
            throw new JsonRpcException(ERROR_CODES.INVALID_METHOD_PARAMS, "Invalid userOpHash");
        }

        const transactionResult = await this.transactionManagerService.sendTransaction(userOperation, userOpHash, chainId);

        return {
            jsonrpc: "2.0",
            result: transactionResult,
            id
        };
    }

    isValidUserOperation(userOperation: UserOperationStruct): boolean {
        if (!isAddress(userOperation.sender)) return false;
        if (!isHex(userOperation.nonce)) return false;
        if (!isHex(userOperation.initCode)) return false;
        if (!isHex(userOperation.callData)) return false;
        if (!isHex(userOperation.callGasLimit)) return false;
        if (!isHex(userOperation.verificationGasLimit)) return false;
        if (!isHex(userOperation.preVerificationGas)) return false;
        if (!isHex(userOperation.maxFeePerGas)) return false;
        if (!isHex(userOperation.maxPriorityFeePerGas)) return false;
        if (!isHex(userOperation.paymasterAndData)) return false;
        if (!isHex(userOperation.signature)) return false;

        if (BigInt(userOperation.maxPriorityFeePerGas) > BigInt(userOperation.maxFeePerGas)) return false;
    
        return true;
    }
}

