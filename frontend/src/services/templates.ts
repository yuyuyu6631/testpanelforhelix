import { client } from '../api/client';
import { InterfaceTemplate, TemplateDebugRequest, TemplateDebugResponse } from '../types/templates';

const BASE_URL = '/templates';

export const TemplateService = {
    // Get list of templates
    getAll: async (skip: number = 0, limit: number = 100): Promise<InterfaceTemplate[]> => {
        return client.get(`${BASE_URL}/`, { params: { skip, limit } });
    },

    // Get single template
    getById: async (id: number): Promise<InterfaceTemplate> => {
        return client.get(`${BASE_URL}/${id}`);
    },

    // Create template
    create: async (data: Partial<InterfaceTemplate>): Promise<InterfaceTemplate> => {
        return client.post(`${BASE_URL}/`, data);
    },

    // Update template
    update: async (id: number, data: Partial<InterfaceTemplate>): Promise<InterfaceTemplate> => {
        return client.put(`${BASE_URL}/${id}`, data);
    },

    // Delete template
    delete: async (id: number): Promise<void> => {
        return client.delete(`${BASE_URL}/${id}`);
    },

    // Debug / Preview
    debug: async (data: TemplateDebugRequest): Promise<TemplateDebugResponse> => {
        return client.post(`${BASE_URL}/debug`, data);
    }
};
