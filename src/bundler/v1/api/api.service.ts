import { Injectable } from '@nestjs/common';
import { JsonRpcException } from 'src/json-exception-handler.filter';
import { ApiHandlerDto } from './dto/api-handler.dto';
import { SendUserOperationService } from './send-user-operation/send-user-operation.service';
import { Web3ProviderService } from '@packages/core/web3-provider/web3-provider.service';

export type RPC_METHODS_TYPE = 'eth_sendUserOperation';

@Injectable()
export class ApiService {
    constructor(
        private readonly sendUserOperationService: SendUserOperationService,
        private readonly web3ProviderService: Web3ProviderService
    ) {}

    async apiHandler(apiRequestInfo: ApiHandlerDto, chainId: number) {
        if (
            !Array.isArray(apiRequestInfo.params) 
            && !(typeof apiRequestInfo.params === 'object' && apiRequestInfo.params !== null)
        ) {
            throw new JsonRpcException(-32602, "Inavlid params");
        }  

        if (!this.web3ProviderService.isSupportedChain(chainId)) {
            throw new JsonRpcException(-32601, "Unsupported chain");
        } 

        switch (apiRequestInfo.method) {
            case 'eth_sendUserOperation':
                return await this.sendUserOperationService.handle();
            default:
                throw new JsonRpcException(-32601, "Unsupported rpc method");
        }
    }
}
