import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Button, Card, message, Slider, Divider } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import client from '../api/client';

const ConfigPanel: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await client.get('/config/');
            // Headers is generic object, convert to string for display if needed or keep as JSON in custom editor
            // For simplicity, we wont edit headers in this version as per plan complexity preference
            form.setFieldsValue(res.data);
        } catch (err) {
            message.error('加载配置失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async (values: any) => {
        try {
            await client.post('/config/', values);
            message.success('配置已更新');
        } catch (err) {
            message.error('保存失败');
        }
    };

    return (
        <Card title="系统配置 (System Config)" bordered={false}>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{ max_workers: 5 }}
            >
                <Form.Item
                    name="user_token"
                    label="User Token (覆写/Override)"
                    tooltip="若设置，将跳过自动登录逻辑，直接使用此 Token"
                >
                    <Input.TextArea rows={4} placeholder="Bearer eyJhbGci..." />
                </Form.Item>

                <Form.Item
                    name="max_workers"
                    label={`并发线程数 (Max Workers): ${form.getFieldValue('max_workers')}`}
                >
                    <Slider min={1} max={20} marks={{ 1: '1', 5: '5', 10: '10', 20: '20' }} />
                </Form.Item>

                {/* 
                <Form.Item name="headers" label="Global Headers (JSON)">
                    <Input.TextArea rows={4} disabled placeholder="{}" />
                </Form.Item> 
                */}

                <Divider />

                <Form.Item>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                        保存配置
                    </Button>
                    <Button style={{ marginLeft: 8 }} onClick={fetchConfig} icon={<ReloadOutlined />}>
                        重置
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
};

export default ConfigPanel;
