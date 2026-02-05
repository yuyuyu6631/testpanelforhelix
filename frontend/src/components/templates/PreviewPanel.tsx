import React, { useState } from 'react';
import { Card, Button, Input, Row, Col, Typography, Tabs, Alert, Spin } from 'antd';
import { PlayCircle } from 'lucide-react';
import { InterfaceTemplate, TemplateDebugResponse } from '../../types/templates';
import { TemplateService } from '../../services/templates';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface Props {
    template: Partial<InterfaceTemplate>;
}

export const PreviewPanel: React.FC<Props> = ({ template }) => {
    const [variables, setVariables] = useState<string>('{\n  "id": "1",\n  "token": "test-token"\n}');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TemplateDebugResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDebug = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            let parsedVars = {};
            try {
                parsedVars = JSON.parse(variables);
            } catch (e) {
                throw new Error("Invalid JSON in Variables");
            }

            const res = await TemplateService.debug({
                template: template,
                variables: parsedVars
            });

            setResult(res);
            if (res.error) {
                setError(res.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Debug & Preview" size="small" style={{ height: '100%' }} bodyStyle={{ height: 'calc(100% - 58px)', overflow: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
                <Title level={5}>Variables (JSON)</Title>
                <TextArea
                    rows={4}
                    value={variables}
                    onChange={e => setVariables(e.target.value)}
                    style={{ fontFamily: 'monospace' }}
                />
            </div>

            <Button
                type="primary"
                icon={<PlayCircle size={16} />}
                block
                onClick={handleDebug}
                loading={loading}
                style={{ marginBottom: 16 }}
            >
                Send Request
            </Button>

            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

            {result && (
                <Tabs defaultActiveKey="1">
                    <TabPane tab="Request" key="1">
                        <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                            <div><Text strong>{result.request.method} {result.request.url}</Text></div>
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">Headers:</Text>
                                <pre style={{ fontSize: 12 }}>{JSON.stringify(result.request.headers, null, 2)}</pre>
                            </div>
                            {result.request.body && (
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">Body:</Text>
                                    <pre style={{ fontSize: 12 }}>{JSON.stringify(result.request.body, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </TabPane>
                    <TabPane tab="Response" key="2">
                        <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                            <div style={{ marginBottom: 8 }}>
                                <Tag color={result.response.status_code >= 200 && result.response.status_code < 300 ? 'green' : 'red'}>
                                    Status: {result.response.status_code}
                                </Tag>
                                <Text type="secondary" style={{ marginLeft: 8 }}>Time: {result.response.duration}s</Text>
                            </div>

                            {result.response.json ? (
                                <pre style={{ fontSize: 12, overflow: 'auto' }}>{JSON.stringify(result.response.json, null, 2)}</pre>
                            ) : (
                                <pre style={{ fontSize: 12, overflow: 'auto' }}>{result.response.text}</pre>
                            )}
                        </div>
                    </TabPane>
                </Tabs>
            )}
        </Card>
    );
};

// Helper for tag
import { Tag } from 'antd';
