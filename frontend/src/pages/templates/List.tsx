import React, { useEffect, useState } from 'react';
import { Table, Button, Space, message, Tag, Popconfirm } from 'antd';
import { Plus, Edit, Trash2, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TemplateService } from '../../services/templates';
import { InterfaceTemplate } from '../../types/templates';

const TemplateList: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<InterfaceTemplate[]>([]);
    const navigate = useNavigate();

    const loadData = async () => {
        setLoading(true);
        try {
            const list = await TemplateService.getAll();
            setData(list);
        } catch (error: any) {
            message.error('加载模板失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await TemplateService.delete(id);
            message.success('模板已删除');
            loadData();
        } catch (error: any) {
            message.error('删除失败: ' + error.message);
        }
    };

    const columns = [
        {
            title: '编码',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Tag color="blue">{text}</Tag>
        },
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: InterfaceTemplate) => (
                <Space>
                    <span style={{ fontWeight: 500 }}>{text}</span>
                    <Tag>{record.version}</Tag>
                </Space>
            )
        },
        {
            title: '接口路径',
            key: 'endpoint',
            render: (_: any, record: InterfaceTemplate) => (
                <Space>
                    <Tag color={getMethodColor(record.method)}>{record.method}</Tag>
                    <span style={{ fontFamily: 'monospace' }}>{record.base_url}{record.endpoint}</span>
                </Space>
            )
        },
        {
            title: '认证',
            dataIndex: 'auth_type',
            key: 'auth_type',
            render: (text: string) => <Tag>{text}</Tag>
        },
        {
            title: '操作',
            key: 'actions',
            render: (_: any, record: InterfaceTemplate) => (
                <Space>
                    <Button
                        icon={<Edit size={14} />}
                        size="small"
                        onClick={() => navigate(`/templates/${record.id}`)}
                    >
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定删除吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Button icon={<Trash2 size={14} />} size="small" danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const getMethodColor = (method: string) => {
        switch (method?.toUpperCase()) {
            case 'GET': return 'green';
            case 'POST': return 'blue';
            case 'PUT': return 'orange';
            case 'DELETE': return 'red';
            default: return 'default';
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>接口模板管理</h2>
                <Button
                    type="primary"
                    icon={<Plus size={16} />}
                    onClick={() => navigate('/templates/new')}
                >
                    新建模板
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};

export default TemplateList;
