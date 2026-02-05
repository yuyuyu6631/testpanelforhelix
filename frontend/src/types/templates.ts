
export interface InterfaceTemplate {
    id: number;
    project_id?: number;
    code: string;
    name: string;
    description?: string;
    version: string;

    // Request Config
    base_url: string;
    method: string; // GET, POST, etc.
    endpoint: string;

    body_type: string; // json, form-data, raw, none
    body_template?: string;
    query_params?: string; // JSON string
    headers?: string;      // JSON string

    // Auth Config
    auth_type: string; // none, bearer, apikey, basic, custom
    auth_config?: string; // JSON string

    // Response Config
    response_parser?: string; // JSON string

    // Advanced
    timeout: number;
    retry_count: number;

    is_active: boolean;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TemplateDebugRequest {
    template: Partial<InterfaceTemplate>;
    variables?: Record<string, any>;
}

export interface TemplateDebugResponse {
    request: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: any;
    };
    response: {
        status_code: number;
        headers: Record<string, string>;
        text: string;
        json?: any;
        duration: number;
    };
    error?: string;
    step?: string;
}
