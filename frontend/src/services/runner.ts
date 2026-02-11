import { client } from '../api/client';
import type { TestCase, TestBatch } from '../types';

export const runnerService = {
    // Trigger test run
    runTests: async (caseIds: number[] = []) => {
        // POST /run body: { case_ids: [] }
        return client.post<{ batch_id: string; message: string }>('/run/', { case_ids: caseIds }) as unknown as Promise<{ batch_id: string; message: string }>;
    },

    // Stop test run
    stopTest: async (batchId: string) => {
        return client.post(`/run/stop?batch_id=${batchId}`);
    },

    // Get batch status (polling fallback)
    getBatchStatus: async (batchId: string) => {
        return client.get<TestBatch>(`/reports/${batchId}`);
    }
};
