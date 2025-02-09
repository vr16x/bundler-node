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
            {
                id: 2,
                name: 'Relayer Two'
            },
            {
                id: 3,
                name: 'Relayer Three'
            },
            {
                id: 4,
                name: 'Relayer Four'
            },
        ];

        return relayers;
    }

    getRelayerPrivateKey(id: number) {
        const privateKey = this.configService.get<string>(`RELAYER_${id}_PRIVATE_KEY`);

        return privateKey ? `0x${privateKey}` : null;
    }
}
