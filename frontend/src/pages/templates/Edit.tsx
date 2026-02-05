import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Card, Tabs, message, Row, Col, InputNumber, Switch, Modal } from 'antd';
import { Save, ArrowLeft, Terminal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TemplateService } from '../../services/templates';
import { ToolsService } from '../../services/tools';
import { InterfaceTemplate } from '../../types/templates';
import { PreviewPanel } from '../../components/templates/PreviewPanel';

const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

const TemplateEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isNew = !id;
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Partial<InterfaceTemplate>>({});
    const [isImportModalVisible, setIsImportModalVisible] = useState(false);
    const [curlCommand, setCurlCommand] = useState('');

    useEffect(() => {
        if (!isNew && id) {
            loadData(Number(id));
        } else {
            // Default values
            form.setFieldsValue({
                method: 'GET',
                body_type: 'json',
                auth_type: 'none',
                timeout: 10,
                retry_count: 0,
                is_active: true,
                version: 'v1.0'
            });
            updateCurrentState();
        }
    }, [id]);

    const loadData = async (templateId: number) => {
        setLoading(true);
        try {
            const data = await TemplateService.getById(templateId);
            form.setFieldsValue(data);
            setCurrentTemplate(data);
        } catch (error: any) {
            message.error('加载模板失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        setLoading(true);
        try {
            if (isNew) {
                await TemplateService.create(values);
                message.success('模板创建成功');
                navigate('/templates');
            } else {
                await TemplateService.update(Number(id), values);
                message.success('模板已保存');
            }
        } catch (error: any) {
            message.error('保存失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateCurrentState = () => {
        // Sync form values to state for PreviewPanel
        try {
            const values = form.getFieldsValue();
            setCurrentTemplate(prev => ({ ...prev, ...values }));
        } catch (e) { }
    };

    const handleCurlImport = async () => {
        if (!curlCommand.trim()) {
            message.warning('请输入 cURL 命令');
            return;
        }
        setLoading(true);
        try {
            const result = await ToolsService.parseCurl(curlCommand);

            // Smart URL split: base_url + endpoint
            let baseUrl = '';
            let endpoint = '';
            try {
                const urlObj = new URL(result.url);
                baseUrl = urlObj.origin;
                endpoint = urlObj.pathname + urlObj.search;
            } catch (e) {
                baseUrl = result.url;
            }

            form.setFieldsValue({
                method: result.method,
                base_url: baseUrl,
                endpoint: endpoint,
            });

            // 1. 智能处理 Body Type & 格式化
            let bodyType = 'none';
            let formattedBody = result.body;

            if (result.body) {
                bodyType = 'raw'; // 默认回退

                // 查找 Content-Type (不区分大小写)
                const contentTypeKey = Object.keys(result.headers).find(k => k.toLowerCase() === 'content-type');
                const contentTypeValue = contentTypeKey ? result.headers[contentTypeKey].toLowerCase() : '';

                if (contentTypeValue.includes('application/json')) {
                    bodyType = 'json';
                    try {
                        const jsonObj = JSON.parse(result.body);
                        formattedBody = JSON.stringify(jsonObj, null, 2);
                    } catch (e) {
                        // 解析失败则保持原样
                    }
                } else if (
                    contentTypeValue.includes('application/x-www-form-urlencoded') ||
                    contentTypeValue.includes('multipart/form-data')
                ) {
                    bodyType = 'form-data';
                }
            }

            // 2. 回填 Headers (当前 UI 为 TextArea，故使用 JSON 字符串)
            // 如果后续 UI 改为键值对列表，此处可改为数组格式
            const headersStr = JSON.stringify(result.headers, null, 2);

            form.setFieldsValue({
                headers: headersStr,
                body_template: formattedBody,
                body_type: bodyType
            });

            updateCurrentState();
            message.success('cURL 命令解析成功');
            setIsImportModalVisible(false);
            setCurlCommand('');
        } catch (error: any) {
            message.error('解析失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/templates')}>
                    返回
                </Button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        icon={<Terminal size={16} />}
                        onClick={() => setIsImportModalVisible(true)}
                    >
                        cURL 导入
                    </Button>
                    <Button
                        type="primary"
                        icon={<Save size={16} />}
                        loading={loading}
                        onClick={form.submit}
                    >
                        保存
                    </Button>
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                onValuesChange={updateCurrentState}
                style={{ flex: 1, display: 'flex', gap: 24 }}
            >
                {/* Left: Configuration */}
                <div style={{ flex: 2, overflow: 'auto' }}>
                    <Card title={isNew ? "新建模板" : "编辑模板"}>
                        <Tabs defaultActiveKey="1">
                            <TabPane tab="基础信息" key="1">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="code" label="编码 (唯一标识)" rules={[{ required: true }]}>
                                            <Input placeholder="例如: order_create_v1" disabled={!isNew} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                                            <Input placeholder="例如: 创建订单" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="version" label="版本">
                                            <Input placeholder="v1.0" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="is_active" label="状态" valuePropName="checked">
                                            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item name="description" label="描述">
                                    <TextArea rows={2} />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="method" label="请求方法" rules={[{ required: true }]}>
                                            <Select>
                                                <Option value="GET">GET</Option>
                                                <Option value="POST">POST</Option>
                                                <Option value="PUT">PUT</Option>
                                                <Option value="DELETE">DELETE</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item name="base_url" label="基础 URL" rules={[{ required: true }]}>
                                            <Input placeholder="https://api.example.com" />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item name="endpoint" label="接口路径" rules={[{ required: true }]} help="使用 {var} 表示路径变量">
                                    <Input placeholder="/api/v1/users/{id}" />
                                </Form.Item>
                            </TabPane>

                            <TabPane tab="请求配置" key="2">
                                <Form.Item name="headers" label="请求头 (JSON)" help='例如: {"Content-Type": "application/json"}'>
                                    <TextArea rows={4} style={{ fontFamily: 'monospace' }} />
                                </Form.Item>

                                <Form.Item name="body_type" label="请求主体类型">
                                    <Select>
                                        <Option value="json">JSON</Option>
                                        <Option value="form-data">Form Data</Option>
                                        <Option value="raw">Raw</Option>
                                        <Option value="none">None</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev.body_type !== curr.body_type}
                                >
                                    {({ getFieldValue }) =>
                                        getFieldValue('body_type') !== 'none' && (
                                            <Form.Item name="body_template" label="主体模态">
                                                <TextArea rows={8} style={{ fontFamily: 'monospace' }} placeholder='{"key": "{{value}}"}' />
                                            </Form.Item>
                                        )
                                    }
                                </Form.Item>
                            </TabPane>

                            <TabPane tab="认证与响应" key="3">
                                <Form.Item name="auth_type" label="认证类型">
                                    <Select>
                                        <Option value="none">None</Option>
                                        <Option value="bearer">Bearer Token</Option>
                                        <Option value="apikey">API Key</Option>
                                        <Option value="custom">Custom</Option>
                                    </Select>
                                </Form.Item>

                                <Form.Item
                                    noStyle
                                    shouldUpdate={(prev, curr) => prev.auth_type !== curr.auth_type}
                                >
                                    {({ getFieldValue }) =>
                                        getFieldValue('auth_type') !== 'none' && (
                                            <Form.Item name="auth_config" label="认证配置 (JSON)">
                                                <TextArea rows={4} style={{ fontFamily: 'monospace' }} placeholder='{"token": "{{token}}"}' />
                                            </Form.Item>
                                        )
                                    }
                                </Form.Item>

                                <Form.Item name="response_parser" label="响应解析器 (JSON)" help="将响应字段映射到内部变量">
                                    <TextArea rows={4} style={{ fontFamily: 'monospace' }} placeholder='{"actual_sql": "$.data.sql"}' />
                                </Form.Item>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="timeout" label="超时时间 (秒)">
                                            <InputNumber min={1} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="retry_count" label="重试次数">
                                            <InputNumber min={0} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </TabPane>
                        </Tabs>
                    </Card>
                </div>

                {/* Right: Preview */}
                <div style={{ flex: 1, minWidth: 400 }}>
                    <PreviewPanel template={currentTemplate} />
                </div>
            </Form>

            <Modal
                title="通过 cURL 命令导入"
                open={isImportModalVisible}
                onOk={handleCurlImport}
                onCancel={() => setIsImportModalVisible(false)}
                confirmLoading={loading}
                width={700}
                destroyOnClose
            >
                <div style={{ marginBottom: 12 }}>请粘贴一段完整的 cURL 命令：</div>
                <TextArea
                    rows={10}
                    value={curlCommand}
                    onChange={e => setCurlCommand(e.target.value)}
                    placeholder="curl -X POST https://api.example.com/v1/user -H 'Content-Type: application/json' -d '{&quot;id&quot;:1}'"
                    style={{ fontFamily: 'monospace' }}
                />
            </Modal>
        </div>
    );
};

export default TemplateEdit;
