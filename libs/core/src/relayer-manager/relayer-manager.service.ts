import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RelayerConfigService } from '../config/relayer/relayer-config.service';
import { Web3ProviderService } from '../web3-provider/web3-provider.service';
import { UserOperationStruct } from '@biconomy/account';

interface RelayerManager {
    id: number;
    name: string;
    privateKey: string;
    pendingTransactionCount: number;
    executingUserOperations: UserOperationStruct[],
}

interface GetRelayerWalletResponse {
    isRelayerAvailable: boolean;
    relayerId: number;
}

@Injectable()
export class RelayerManagerService implements OnModuleInit {
    constructor(
        private readonly relayerConfigService: RelayerConfigService,
        private readonly web3ProviderService: Web3ProviderService
    ) {}

    private readonly logger = new Logger(RelayerManagerService.name);

    private relayerInitialized = false;
    private relayers: Record<number, RelayerManager> = {}

    async onModuleInit() {
        await this.initialize();
    }

    async initialize() {
        if (this.relayerInitialized) {
            return;
        }

        const relayers = this.relayerConfigService.getRelayers();

        for await (const relayer of relayers) {
            const relayerPrivateKey = this.relayerConfigService.getRelayerPrivateKey(relayer.id);

            if (!relayerPrivateKey || relayerPrivateKey === '') {
                this.logger.error(`Relayer ${relayer.name} private key is not configured`);
            }

            let relayerManager: RelayerManager = {
                id: relayer.id,
                name: relayer.name,
                privateKey: relayerPrivateKey,
                pendingTransactionCount: 0,
                executingUserOperations: []
            };

            this.relayers[relayer.id] = relayerManager;
        }

        this.relayerInitialized = true;
    }

    getActiveRelayer(): GetRelayerWalletResponse {
        let relayer: RelayerManager | null = null;

        for (let relayerInfo of Object.values(this.relayers)) {
            if (relayerInfo.pendingTransactionCount === 0) {
                relayer = relayerInfo;
            }
        }

        if (relayer) {    
            return {
                isRelayerAvailable: true,
                relayerId: relayer.id,
            };
        } else {
            return {
                isRelayerAvailable: false,
                relayerId: -1,
            };
        }
    }

    async getRelayerWalletById(relayerId: number, chainId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        const relayerWallet = this.web3ProviderService.getWalletByPk(relayer.privateKey, chainId);

        return relayerWallet;
    }

    consumeRelayer(relayerId: number, userOperation: UserOperationStruct) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        relayer.executingUserOperations.push(userOperation);
        relayer.pendingTransactionCount += 1;
    }

    relieveRelayer(relayerId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        if (relayer.executingUserOperations.length <= 0 && relayer.pendingTransactionCount === 0) {
            return;
        }

        relayer.executingUserOperations.shift()
        relayer.pendingTransactionCount -= 1;
    }
}
