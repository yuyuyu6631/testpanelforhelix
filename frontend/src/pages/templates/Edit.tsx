import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Button, Card, Tabs, message, Row, Col, InputNumber, Switch } from 'antd';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TemplateService } from '../../services/templates';
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

    return (
        <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/templates')}>
                    返回
                </Button>
                <div>
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
        </div>
    );
};

export default TemplateEdit;
