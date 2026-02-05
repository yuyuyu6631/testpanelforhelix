import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Table, Tag, Alert, Typography, Space, Row, Col, Badge, Empty, Spin } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import client from '../api/client';
import { msg } from '../utils/message';

const { Text, Title } = Typography;

interface TestResult {
    case_id: number;
    question: string;
    actual_sql: string;
    expected_sql?: string;
    result: string;
    message: string;
    duration?: number;
}

interface CaseItem {
    id: number;
    question: string;
    status: 'waiting' | 'running' | 'success' | 'fail';
    duration?: number;
    result?: TestResult;
}

interface RunnerProps {
    initialTriggerIds?: number[];
    onTriggerConsumed?: () => void;
}

const Runner: React.FC<RunnerProps> = ({ initialTriggerIds, onTriggerConsumed }) => {
    const [running, setRunning] = useState(false);
    const [batchId, setBatchId] = useState<string | null>(null);
    const [cases, setCases] = useState<CaseItem[]>([]);
    const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
    const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [loading, setLoading] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);

    // SQL Helper to highlight differences (Simple linear diff)
    const renderSqlDiff = (expected: string, actual: string) => {
        if (!expected) return <pre style={{ color: '#666' }}>{actual}</pre>;
        // Very basic word-level highlighting for demo purposes
        const expWords = expected.split(/\s+/);
        const actWords = actual.split(/\s+/);

        return (
            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}>
                {actWords.map((word, i) => {
                    const isDiff = word.toLowerCase() !== expWords[i]?.toLowerCase();
                    return (
                        <span key={i} style={{
                            backgroundColor: isDiff ? '#fff1f0' : 'transparent',
                            color: isDiff ? '#cf1322' : 'inherit',
                            padding: '0 2px',
                            margin: '0 2px',
                            borderRadius: '2px',
                            textDecoration: isDiff ? 'underline wavy' : 'none'
                        }}>
                            {word}{' '}
                        </span>
                    );
                })}
            </div>
        );
    };

    const checkServerStatus = async () => {
        try {
            await client.get('/health');
            setWsStatus('connected');
        } catch (err) {
            setWsStatus('disconnected');
        }
    };

    useEffect(() => {
        checkServerStatus();
        const interval = setInterval(checkServerStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    // 页面加载时检查是否有正在运行的批次
    useEffect(() => {
        const restoreActiveBatch = async () => {
            try {
                const res = await client.get('/run/active-batches');
                const activeBatches = res.data;

                if (activeBatches.length > 0) {
                    // 恢复最新的运行批次
                    const latestBatch = activeBatches[0];
                    console.log('恢复运行中的批次:', latestBatch);

                    setBatchId(latestBatch.batch_id);
                    setRunning(true);
                    connectWS(latestBatch.batch_id);

                    msg.info('已恢复运行中的测试任务');
                }
            } catch (err) {
                console.error('恢复批次失败:', err);
            }
        };

        restoreActiveBatch();
    }, []);

    // Effect to handle trigger from CaseManager
    useEffect(() => {
        if (initialTriggerIds && initialTriggerIds.length > 0 && !running && !loading) {
            console.log('Detected trigger from CaseManager:', initialTriggerIds);
            startRun(initialTriggerIds);
            if (onTriggerConsumed) onTriggerConsumed();
        }
    }, [initialTriggerIds]);

    const connectWS = (id: string) => {
        const hostname = window.location.hostname;
        const host = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') : `ws://${hostname}:8000`;
        const wsUrl = `${host}/run/ws/${id}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            // 处理批次状态恢复（重连时）
            if (data.type === 'batch_status') {
                console.log('批次状态:', data);
                // 如果批次已完成，更新状态
                if (data.status === 'COMPLETED' || data.status === 'STOPPED') {
                    setRunning(false);
                }
            } else if (data.type === 'init') {
                const initialCases = data.cases.map((c: any) => ({
                    id: c.id,
                    question: c.question,
                    status: 'waiting'
                }));
                setCases(initialCases);
            } else if (data.type === 'running') {
                setCases(prev => prev.map(c =>
                    c.id === data.case_id ? { ...c, status: 'running' as const } : c
                ));
            } else if (data.type === 'update') {
                setCases(prev => prev.map(c => {
                    if (c.id === data.case_id) {
                        return {
                            ...c,
                            status: data.result.result === 'PASS' ? 'success' : 'fail',
                            duration: data.result.duration,
                            result: data.result
                        };
                    }
                    return c;
                }));
                setSelectedCase(prev => {
                    if (prev && prev.id === data.case_id) {
                        return {
                            ...prev,
                            status: data.result.result === 'PASS' ? 'success' : 'fail',
                            duration: data.result.duration,
                            result: data.result
                        };
                    }
                    return prev;
                });
            } else if (data.type === 'done') {
                setRunning(false);
                msg.success('测试执行完成');
                if (wsRef.current) wsRef.current.close();
            } else if (data.type === 'error') {
                msg.error(`异常: ${data.message}`);
                setRunning(false);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket 关闭，尝试重连...');
            if (running) {
                // 3秒后自动重连
                setTimeout(() => {
                    if (running && batchId) {
                        console.log('正在重连 WebSocket...');
                        connectWS(batchId);
                    }
                }, 3000);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket 错误:', error);
        };
    };

    const startRun = async (ids: number[] = []) => {
        setLoading(true);
        try {
            const res = await client.post('/run/', { case_ids: ids });
            const { batch_id, cases: initialCases } = res.data;
            setBatchId(batch_id);
            setRunning(true);
            setCases(initialCases.map((c: any) => ({ ...c, status: 'waiting' })));
            setSelectedCase(null);
            connectWS(batch_id);
            msg.success('测试任务已启动');
        } catch (err) {
            msg.error('启动失败');
        } finally {
            setLoading(false);
        }
    };

    const stopRun = async () => {
        if (!batchId) return;
        try {
            await client.post('/run/stop', null, { params: { batch_id: batchId } });
            setRunning(false);
        } catch (err) {
            msg.error('停止失败');
        }
    };

    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
        { title: '用例名称', dataIndex: 'question', key: 'question', ellipsis: true },
        {
            title: '状态',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status: string) => {
                const colors = { waiting: 'default', running: 'processing', success: 'success', fail: 'error' };
                const texts = { waiting: '等待', running: '运行中', success: '成功', fail: '失败' };
                return <Tag color={(colors as any)[status]}>{(texts as any)[status]}</Tag>;
            }
        },
        { title: '耗时', dataIndex: 'duration', key: 'duration', width: 80, render: (d?: number) => d ? `${d}s` : '-' }
    ];

    return (
        <div style={{ padding: '0 24px 24px', minHeight: 'calc(100vh - 64px)' }}>
            {wsStatus === 'disconnected' && (
                <Alert message="服务已离线，无法进行新的测试，历史追溯数据已保留。" type="warning" banner showIcon style={{ marginBottom: 16 }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingTop: 16 }}>
                <Title level={3} style={{ margin: 0 }}>执行控制台</Title>
                <Space>
                    <Badge status={wsStatus === 'connected' ? 'success' : 'error'} text={wsStatus === 'connected' ? '在线' : '离线'} />
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => startRun([])} disabled={running || loading || wsStatus === 'disconnected'}>
                        全量测试
                    </Button>
                    {running && <Button danger icon={<StopOutlined />} onClick={stopRun}>停止</Button>}
                </Space>
            </div>

            <Row gutter={24}>
                <Col span={10}>
                    <Card title="执行队列" size="small">
                        <Table dataSource={cases} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 12 }}
                            onRow={(record) => ({
                                onClick: () => setSelectedCase(record),
                                style: { cursor: 'pointer', background: selectedCase?.id === record.id ? '#f0faff' : 'inherit' }
                            })} />
                    </Card>
                </Col>
                <Col span={14}>
                    <Card title="详情追溯 & SQL 对比" size="small" style={{ minHeight: 600 }}>
                        {selectedCase ? (
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <Alert message={selectedCase.question} type="info" />
                                {selectedCase.result ? (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div style={{ padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                                                <Text strong>预期 SQL</Text>
                                                <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', color: '#52c41a' }}>{selectedCase.result.expected_sql || '空'}</pre>
                                            </div>
                                            <div style={{ padding: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}>
                                                <Text strong>实际 SQL (差异点高亮)</Text>
                                                <div style={{ marginTop: 8 }}>
                                                    {renderSqlDiff(selectedCase.result.expected_sql || '', selectedCase.result.actual_sql)}
                                                </div>
                                            </div>
                                        </div>
                                        <Alert
                                            message={selectedCase.status === 'success' ? '校验通过' : '校验失败'}
                                            description={selectedCase.result.message}
                                            type={selectedCase.status === 'success' ? 'success' : 'error'}
                                            showIcon
                                        />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin tip="等待结果推送..." /></div>
                                )}
                            </Space>
                        ) : <Empty description="点击左侧用例追溯数据" style={{ marginTop: 100 }} />}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Runner;
