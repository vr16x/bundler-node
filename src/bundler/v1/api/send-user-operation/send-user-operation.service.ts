import { Injectable } from '@nestjs/common';
import { RelayerManagerService } from '@packages/core/relayer-manager/relayer-manager.service';
import { RequestInfo } from '../api.service';
import { UserOperation } from 'viem/_types/account-abstraction/types/userOperation';

export interface SendUserOperationParams {
    userOperation: UserOperation;
    userOpHash: string;
};

@Injectable()
export class SendUserOperationService {
    constructor(private readonly relayerManagerService: RelayerManagerService) {}

    async handle(requestInfo: RequestInfo, chainId: number) {
        const relayer = await this.relayerManagerService.getRelayerById(1, chainId);
        const id = requestInfo.id;
        const { userOperation, userOpHash } = (requestInfo.params as unknown) as SendUserOperationParams;

        console.log(userOperation, userOpHash, id);
    }
}
