import { client } from '../api/client';
import type { TestCase } from '../types';

export const casesService = {
    // Get cases with pagination
    getCases: async (params?: { skip?: number; limit?: number }) => {
        return client.get<TestCase[]>('/cases/', { params }) as unknown as Promise<TestCase[]>;
    },

    // Create new case
    createCase: async (data: Partial<TestCase>) => {
        return client.post<TestCase>('/cases/', data);
    },

    // Update case status
    updateStatus: async (caseId: number, isActive: boolean) => {
        return client.patch<TestCase>(`/cases/${caseId}`, { is_active: isActive });
    },

    // Batch update status
    batchUpdateStatus: async (caseIds: number[], isActive: boolean) => {
        return client.post('/cases/batch-status', { case_ids: caseIds, is_active: isActive });
    },

    // Import Cases
    importCases: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return client.post('/cases/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    // Delete a single case
    deleteCase: async (id: number) => {
        return client.delete(`/cases/${id}`);
    },

    // Delete all cases
    clearAll: async () => {
        return client.delete('/cases/clear-all');
    }
};
