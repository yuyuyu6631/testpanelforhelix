import { client } from '../api/client';

export interface CurlParseResult {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
}

export const ToolsService = {
    parseCurl: async (curlCommand: string): Promise<CurlParseResult> => {
        const response = await client.post<CurlParseResult>('/tools/parse-curl', {
            curl_command: curlCommand
        });
        return response.data;
    }
};
