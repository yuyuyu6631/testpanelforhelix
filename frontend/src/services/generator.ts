import { client } from '../api/client';

export interface GeneratorMetadata {
    indicator_count: number;
    company_count: number;
    sample_indicators: string[];
    sample_companies: string[];
}

export const generatorService = {
    // Preview metadata
    getMetadata: async () => {
        return client.get('/generate/preview') as unknown as Promise<GeneratorMetadata>;
    },

    // Generate cases from database metadata
    generateCases: async (count: number = 3) => {
        return client.post('/generate/cases', {}, {
            params: { count }
        }) as unknown as Promise<{ generated: number; message: string }>;
    }
};
