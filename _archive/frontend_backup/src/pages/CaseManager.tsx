import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, message, Upload, Space, Tag, Popconfirm } from 'antd';
import type { UploadProps } from 'antd';
import type { TableRowSelection } from 'antd/es/table/interface';
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined, PlayCircleOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import client from '../api/client';
import { msg } from '../utils/message';
import ErrorResult from '../components/ErrorResult';

interface TestCase {
    id: number;
    question: string;
    expected_keywords: string;
    expected_conditions: string;
    expected_sql: string;
    is_active: boolean;
}

interface CaseManagerProps {
    onTriggerRun?: (ids: number[]) => void;
}

const CaseManager: React.FC<CaseManagerProps> = ({ onTriggerRun }) => {
    const [cases, setCases] = useState<TestCase[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<TestCase | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [generating, setGenerating] = useState(false);
    const [form] = Form.useForm();

    const fetchCases = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await client.get('/cases/');
            setCases(res.data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unknown Error");
            msg.error('加载用例失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            if (editingCase) {
                await client.put(`/cases/${editingCase.id}`, values);
                message.success('更新成功');
            } else {
                await client.post('/cases/', values);
                message.success('创建成功');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingCase(null);
            fetchCases();
        } catch (err) {
            message.error('操作失败');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await client.delete(`/cases/${id}`);
            message.success('删除成功');
            fetchCases();
        } catch (err) {
            message.error('删除失败');
        }
    };

    const handleClearAll = async () => {
        try {
            await client.delete('/cases/clear-all');
            message.success('已清空所有用例');
            fetchCases();
            setSelectedRowKeys([]);
        } catch (err) {
            message.error('清空失败');
        }
    };

    const handleAutoGenerate = async () => {
        setGenerating(true);
        try {
            await client.post(`/generate/cases?count=2`);
            message.success(`生成成功`);
            fetchCases();
        } catch (err: any) {
            message.error('生成失败: ' + (err.response?.data?.detail || err.message));
        } finally {
            setGenerating(false);
        }
    };

    const handleRunSelected = () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请先选择要执行的用例');
            return;
        }
        if (onTriggerRun) {
            onTriggerRun(selectedRowKeys.map(key => Number(key)));
        }
    };

    const handleBatchStatus = async (isActive: boolean) => {
        if (selectedRowKeys.length === 0) {
            message.warning('请先选择用例');
            return;
        }
        try {
            await client.post('/cases/batch-status', selectedRowKeys, {
                params: { is_active: isActive }
            });
            message.success('更新成功');
            setSelectedRowKeys([]);
            fetchCases();
        } catch (err) {
            message.error('操作失败');
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        action: 'http://localhost:8000/cases/import',
        onChange(info) {
            if (info.file.status === 'done') {
                message.success('导入成功');
                fetchCases();
            } else if (info.file.status === 'error') {
                message.error(`${info.file.name} 导入失败`);
            }
        },
    };

    const rowSelection: TableRowSelection<TestCase> = {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', width: 60 },
        { title: '问题', dataIndex: 'question', ellipsis: true },
        { title: '预期关键字', dataIndex: 'expected_keywords', ellipsis: true, width: 150 },
        { title: '预期条件', dataIndex: 'expected_conditions', ellipsis: true, width: 120 },
        { title: '状态', dataIndex: 'is_active', render: (val: boolean) => val ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>, width: 80 },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_: any, record: TestCase) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => { setEditingCase(record); form.setFieldsValue(record); setIsModalOpen(true); }} />
                    <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>用例管理</h2>
                <Space>
                    <Popconfirm title="确定清空所有用例吗？此操作不可逆！" onConfirm={handleClearAll}>
                        <Button danger>清空所有</Button>
                    </Popconfirm>
                    <Button
                        icon={<ThunderboltOutlined />}
                        onClick={handleAutoGenerate}
                        loading={generating}
                    >
                        自动生成
                    </Button>

                    <Upload {...uploadProps} showUploadList={false}>
                        <Button icon={<UploadOutlined />}>导入 CSV</Button>
                    </Upload>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingCase(null); form.resetFields(); setIsModalOpen(true); }}>
                        新建用例
                    </Button>
                </Space>
            </div>

            {selectedRowKeys.length > 0 && (
                <div style={{ marginBottom: 16, padding: '8px 16px', background: '#e6f7ff', borderRadius: 4 }}>
                    <Space>
                        <span>已选择 {selectedRowKeys.length} 条用例</span>
                        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleRunSelected}>
                            执行选中
                        </Button>
                        <Button icon={<StopOutlined />} onClick={() => handleBatchStatus(false)} danger>
                            批量禁用
                        </Button>
                        <Button icon={<CheckCircleOutlined />} onClick={() => handleBatchStatus(true)}>
                            批量启用
                        </Button>
                        <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
                    </Space>
                </div>
            )}

            {error ? (
                <ErrorResult error={error} onRetry={fetchCases} />
            ) : loading ? (
                <div style={{ padding: 20, background: '#fff' }}>
                    <Skeleton active paragraph={{ rows: 10 }} />
                </div>
            ) : (
                <Table
                    dataSource={cases}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    rowSelection={rowSelection}
                    pagination={{ pageSize: 15 }}
                    scroll={{ y: 500 }}
                />
            )}

            <Modal
                title={editingCase ? "编辑用例" : "新建用例"}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={() => setIsModalOpen(false)}
                okText="确定"
                cancelText="取消"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="question" label="问题 (Question)" rules={[{ required: true, message: '请输入问题' }]}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="expected_keywords" label="预期关键字 (Keywords)">
                        <Input placeholder="多个关键字请用逗号分隔" />
                    </Form.Item>
                    <Form.Item name="expected_conditions" label="预期条件 (Conditions)">
                        <Input placeholder="多个条件请用逗号分隔" />
                    </Form.Item>
                    <Form.Item name="expected_sql" label="预期 SQL (Expected SQL)">
                        <Input.TextArea rows={3} placeholder="Standard SQL for diff comparison" />
                    </Form.Item>
                    <Form.Item name="is_active" valuePropName="checked">
                        <Checkbox>启用</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CaseManager;
