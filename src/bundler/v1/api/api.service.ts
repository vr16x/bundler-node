import { Injectable } from '@nestjs/common';
import { JsonRpcException } from '@packages/core/common/exception-filters/json-exception-handler.filter';
import { ApiHandlerDto } from './dto/api-handler.dto';
import { SendUserOperationService } from './send-user-operation/send-user-operation.service';
import { Web3ProviderService } from '@packages/core/web3-provider/web3-provider.service';
import { ERROR_CODES } from '@packages/core/common/error-handler/error-codes';

export type RPC_METHODS_TYPE = 'eth_sendUserOperation';
export type RequestInfo = {
    id: number;
    params: Array<string> | Record<string, string>;
};

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
            throw new JsonRpcException(ERROR_CODES.INVALID_METHOD_PARAMS, "Inavlid params");
        }  

        if (!this.web3ProviderService.isSupportedChain(chainId)) {
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Unsupported chain");
        } 

        const requestInfo: RequestInfo = {
            id: apiRequestInfo.id,
            params: apiRequestInfo.params
        };

        switch (apiRequestInfo.method) {
            case 'eth_sendUserOperation':
                return await this.sendUserOperationService.handle(requestInfo, chainId);
            default:
                throw new JsonRpcException(ERROR_CODES.METHOD_NOT_FOUND, "Unsupported rpc method");
        }
    }
}
