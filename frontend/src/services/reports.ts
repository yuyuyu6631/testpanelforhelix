import { client } from '../api/client';
import type { TestBatch, ReportDetail } from '../types';

export const reportsService = {
    // Get reports list
    getReports: async (params?: { skip?: number; limit?: number }) => {
        return client.get<TestBatch[]>('/reports/', { params }) as unknown as Promise<TestBatch[]>;
    },

    // Get report details
    getReportDetails: async (batchId: string) => {
        return client.get<ReportDetail[]>(`/reports/${batchId}/details`) as unknown as Promise<ReportDetail[]>;
    },

    // Export report
    exportReport: async (batchId: string) => {
        return client.get(`/reports/${batchId}/export`, { responseType: 'blob' });
    }
};
