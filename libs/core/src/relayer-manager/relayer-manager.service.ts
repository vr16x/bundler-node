import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RelayerConfigService } from '../config/relayer/relayer-config.service';
import { Web3ProviderService } from '../web3-provider/web3-provider.service';
import { UserOperationStruct } from '@biconomy/account';

interface RelayerState {
    currentNonce: number;
    usedNonces: number[];
    pendingTransactionCount: number;
    executingUserOperations: UserOperationStruct[],
}

interface RelayerManager {
    id: number;
    name: string;
    privateKey: string;
    relayerState: Record<number, RelayerState>;
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
                relayerState: {},
            };

            const supportedChainIds = this.web3ProviderService.getSupportedChainIds();

            supportedChainIds.forEach(chainId => {
                relayerManager.relayerState[chainId] = {
                    pendingTransactionCount: 0,
                    executingUserOperations: [],
                    currentNonce: 0,
                    usedNonces: [],
                };
            });

            this.relayers[relayer.id] = relayerManager;
        }

        this.relayerInitialized = true;
    }

    getActiveRelayer(chainId: number): GetRelayerWalletResponse {
        let relayer: RelayerManager | null = null;

        for (let relayerInfo of Object.values(this.relayers)) {
            if (relayerInfo.relayerState[chainId].pendingTransactionCount === 0) {
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

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }
        
        const relayerWallet = this.web3ProviderService.getWalletByPk(relayer.privateKey, chainId);

        return relayerWallet;
    }

    consumeRelayer(relayerId: number, userOperation: UserOperationStruct, chainId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        relayer.relayerState[chainId].executingUserOperations.push(userOperation);
        relayer.relayerState[chainId].pendingTransactionCount += 1;
    }

    async getRelayerNonce(relayerId: number, chainId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        let nonce = relayer.relayerState[chainId].currentNonce;
        const usedNonces = relayer.relayerState[chainId].usedNonces;

        if (nonce === 0 || usedNonces.includes(nonce)) {
            const wallet = await this.getRelayerWalletById(relayerId, chainId);
            const latestNonce = await this.web3ProviderService.getNonce(wallet.account.address, chainId);

            relayer.relayerState[chainId].currentNonce = latestNonce;
            nonce = latestNonce;
        }

        return nonce;
    }

    async markRelayerNonce(relayerId: number, usedNonce: number, chainId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        relayer.relayerState[chainId].currentNonce += 1;
        relayer.relayerState[chainId].usedNonces.push(usedNonce);
    }

    relieveRelayer(relayerId: number, chainId: number) {
        const relayer: RelayerManager = this.relayers[relayerId];

        if (!relayer) {
            this.logger.error(`Relayer with ID ${relayerId} not found`);
        }

        if (relayer.relayerState[chainId].executingUserOperations.length <= 0 && relayer.relayerState[chainId].pendingTransactionCount === 0) {
            return;
        }

        relayer.relayerState[chainId].executingUserOperations.shift()
        relayer.relayerState[chainId].pendingTransactionCount -= 1;
    }
}
