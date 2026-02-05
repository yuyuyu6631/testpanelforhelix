
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Debugging Interceptors
apiClient.interceptors.request.use(request => {
    console.log('[API Request]', request.method?.toUpperCase(), request.url);
    return request;
});

apiClient.interceptors.response.use(
    response => {
        console.log('[API Response]', response.status, response.config.url);
        return response;
    },
    error => {
        console.error('[API Error]', error.message, error.response?.data);
        return Promise.reject(error);
    }
);

// --- Types ---

export interface TestCase {
    id: number;
    question: string;
    expected_keywords?: string;
    expected_conditions?: string;
    is_active: boolean;
    created_at?: string;
    // Frontend auxiliary properties
    status?: 'passed' | 'failed' | 'running' | 'pending';
    lastRun?: string;
    lastResult?: string;
    lastError?: string;
}

export interface TestRunResponse {
    message: string;
    batch_id: string;
}

export interface TestResult {
    case_id: number;
    question: string;
    actual_sql: string;
    result: 'PASS' | 'FAIL';
    message: string;
}

// --- API Methods ---

export const apiService = {
    /**
     * Get all test cases
     */
    fetchCases: async (): Promise<TestCase[]> => {
        try {
            const response = await apiClient.get<TestCase[]>('/cases/');
            // Map backend data to frontend model (init status as pending)
            return response.data.map(item => ({
                ...item,
                status: 'pending',
                lastRun: '未执行'
            }));
        } catch (error) {
            console.error('Failed to fetch cases:', error);
            throw error;
        }
    },

    /**
     * Trigger a test run
     * @param caseIds Optional list of IDs to run. If empty, runs all.
     */
    runTests: async (caseIds?: number[]): Promise<string> => {
        try {
            const response = await apiClient.post<TestRunResponse>('/run/', {
                case_ids: caseIds
            });
            return response.data.batch_id;
        } catch (error) {
            console.error('Failed to trigger run:', error);
            throw error;
        }
    },

    /**
     * Get results for a specific batch
     */
    getRunHistory: async (batchId: string): Promise<TestResult[]> => {
        try {
            const response = await apiClient.get<TestResult[]>(`/run/history/${batchId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch history:', error);
            throw error;
        }
    },

    /**
     * Check system health
     */
    checkHealth: async (): Promise<boolean> => {
        try {
            await apiClient.get('/health');
            return true;
        } catch (e) {
            return false;
        }
    }
};
