import { Injectable, Logger } from '@nestjs/common';
import { RelayerConfigService } from '../config/relayer/relayer-config.service';
import { Web3ProviderService } from '../web3-provider/web3-provider.service';
import { JsonRpcException } from '../common/exception-filters/json-exception-handler.filter';
import { ERROR_CODES } from '../common/error-handler/error-codes';

interface RelayerManager {
    id: string;
    name: string;
}

@Injectable()
export class RelayerManagerService {
    constructor(
        private readonly relayerConfigService: RelayerConfigService,
        private readonly web3ProviderService: Web3ProviderService
    ) {}

    private readonly logger = new Logger(RelayerManagerService.name);

    relayers = {};
    // async getRelayers(chainId: number) {
    //     const relayers = this.relayerConfigService.getRelayers();

    //     for await (let relayer of relayers) {
    //         const relayerPrivateKey = this.relayerConfigService.getRelayerPrivateKey(relayer.id);

    //         if (!relayerPrivateKey || relayerPrivateKey === '') {
    //             this.logger.log(`Relayer ${relayer.name} is not available`);
    //             continue;
    //         }

    //         console.log(relayerPrivateKey);

    //         let relayerWallet = this.web3ProviderService.getWalletByPk(relayerPrivateKey);
    //         const chain = this.web3ProviderService.getChain(chainId);
    //         await relayerWallet.addChain({ chain });

    //         return relayerWallet;
    //     }
    // }

    async getRelayerById(id: number, chainId: number) {
        const relayers = this.relayerConfigService.getRelayers();

        const [relayer] = relayers.filter((relayerInfo) => relayerInfo.id === id);

        if (!relayer) {
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, "Relayer not found")
        }

        const relayerPrivateKey = this.relayerConfigService.getRelayerPrivateKey(relayer.id);

        if (!relayerPrivateKey || relayerPrivateKey === '') {
            throw new JsonRpcException(ERROR_CODES.INTERNAL_JSON_RPC_ERROR, `Relayer ${relayer.name} is not available`)
        }

        const relayerWallet = this.web3ProviderService.getWalletByPk(relayerPrivateKey, chainId);

        return relayerWallet;
    }
}
