import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RelayerMetadata {
    id: number;
    name: string;
}

@Injectable()
export class RelayerConfigService {
    constructor(private readonly configService: ConfigService) {}

    getRelayers() {
        const relayers: RelayerMetadata[] = [
            {
                id: 1,
                name: 'Relayer One'
            },
        ];

        return relayers;
    }

    getRelayerPrivateKey(id: number) {
        return `0x${this.configService.get<string>(`RELAYER_${id}_PRIVATE_KEY`)}`;
    }
}
