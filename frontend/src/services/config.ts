import { client } from '../api/client';
import type { SystemConfig } from '../types';

export const configService = {
    getConfig: async () => {
        return client.get<SystemConfig>('/config/') as unknown as Promise<SystemConfig>;
    },

    updateConfig: async (config: Partial<SystemConfig>) => {
        return client.post<SystemConfig>('/config/', config);
    }
};
