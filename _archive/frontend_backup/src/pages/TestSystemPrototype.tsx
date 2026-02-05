import { useState, useEffect } from 'react';
import { Drawer, message, Tooltip, Tag } from 'antd';
import { apiService } from '../api/service';
import type { TestCase } from '../api/service';

// --- Components ---

const StatusBadge = ({ status, result }: { status?: string, result?: string }) => {
    // Priority: Result > Status
    let displayStatus = 'pending';
    if (result === 'PASS') displayStatus = 'passed';
    else if (result === 'FAIL') displayStatus = 'failed';
    else if (status === 'running') displayStatus = 'running';

    const configs: Record<string, any> = {
        passed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: '通过', icon: '●' },
        failed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '失败', icon: '●' },
        running: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '执行中', icon: 'cw' },
        pending: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: '待执行', icon: '○' },
    };

    const config = configs[displayStatus] || configs.pending;
    const isSpinning = displayStatus === 'running';

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit ${config.bg} ${config.text} ${config.border}`}>
            <span className={`text-[10px] ${isSpinning ? 'animate-spin' : ''}`}>
                {isSpinning ? '↻' : config.icon}
            </span>
            {config.label}
        </span>
    );
};

const Sidebar = () => {
    // Navigation logic handled by router in real app, here we simulate or use Link if router available
    // For prototype, we just render UI
    return (
        <div className="w-64 bg-[#0f172a] h-screen text-slate-300 flex flex-col fixed left-0 top-0 border-r border-slate-800 z-10 transition-all duration-300">
            <div className="h-16 flex items-center px-6 border-b border-slate-800/50">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 font-bold text-white shadow-lg shadow-indigo-500/30">H</div>
                <span className="text-lg font-bold text-white tracking-tight">Helix <span className="text-indigo-400 font-light">Test</span></span>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                <NavItem icon="📊" label="仪表盘" active />
                <a href="/cases"><NavItem icon="🧪" label="测试用例" /></a>
                <a href="/plans"><NavItem icon="⚡" label="执行计划" /></a>
                <a href="/reports"><NavItem icon="📑" label="测试报告" /></a>
                <div className="pt-4 mt-4 border-t border-slate-800/50">
                    <a href="/settings"><NavItem icon="⚙️" label="系统设置" /></a>
                </div>
            </nav>

            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white font-bold ring-2 ring-indigo-500/20">AD</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Administrator</p>
                        <p className="text-xs text-slate-500 truncate">超级管理员</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active = false }: { icon: string, label: string, active?: boolean }) => (
    <div className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' : 'hover:bg-slate-800/50 hover:text-white'}`}>
        <span className={`text-lg transition-transform group-hover:scale-110 ${active ? 'opacity-100' : 'opacity-70'}`}>{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </div>
);

const StatCard = ({ title, value, trend, isGood }: { title: string, value: string | number, trend?: string, isGood?: boolean }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-500 hover:shadow-lg">
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2 h-9">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {value}
            </span>
            {trend && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded animate-fade-in ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend}
                </span>
            )}
        </div>
    </div>
);

export default function TestSystemPrototype() {
    // --- State Definition ---
    const [cases, setCases] = useState<TestCase[]>([]);
    const [loading, setLoading] = useState(false);
    const [isGlobalRunning, setIsGlobalRunning] = useState(false);

    // UI States
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

    // Stats (Computed from real data)
    const [stats, setStats] = useState({ totalCases: 0, passRate: 0, dailyExecutions: 0, activeIssues: 0 });

    // --- Initialization ---
    useEffect(() => {
        console.log("TestSystemPrototype mounted. Initiating loadData...");
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await apiService.fetchCases();
            setCases(data);
            updateStats(data);
        } catch (error) {
            message.error("无法连接到后端服务，请确认 start_project.bat 已启动");
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (currentCases: TestCase[]) => {
        setStats({
            totalCases: currentCases.length,
            passRate: 0, // Need history to calc
            dailyExecutions: 0, // Need history
            activeIssues: 0
        });
    };

    // --- Logic ---
    const handleRunAll = async () => {
        if (cases.length === 0) return;

        setIsGlobalRunning(true);
        // Optimistic UI update
        setCases(prev => prev.map(c => ({ ...c, status: 'running' })));

        try {
            // 1. Trigger Run
            const batchId = await apiService.runTests();
            message.success(`测试已提交 (Batch: ${batchId.substring(0, 8)})`);

            // 2. Poll for results (Simple Implementation: Wait 3s then fetch once)
            // In production, we should poll status or use WebSocket
            setTimeout(async () => {
                try {
                    const results = await apiService.getRunHistory(batchId);

                    // Merge results back to cases
                    setCases(prev => prev.map(c => {
                        const res = results.find(r => r.case_id === c.id);
                        if (res) {
                            return { ...c, status: 'passed', lastResult: res.result, lastError: res.message };
                        }
                        return { ...c, status: 'failed', lastResult: 'FAIL', lastError: 'Timeout' };
                    }));
                    setIsGlobalRunning(false);
                    message.success("测试执行完成");
                } catch (e) {
                    console.error(e);
                    message.error("获取执行结果失败");
                    setIsGlobalRunning(false);
                }
            }, 3000);

        } catch (error) {
            message.error("执行失败");
            setCases(prev => prev.map(c => ({ ...c, status: 'pending' })));
            setIsGlobalRunning(false);
        }
    };

    const handleEdit = (testCase: TestCase) => {
        setSelectedCase(testCase);
        setDrawerOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900">
            <Sidebar />

            <main className="ml-64 flex-1 p-10 transition-all duration-300">
                {/* Header Area */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">仪表盘</h2>
                            <Tag color="blue">实时模式</Tag>
                        </div>
                        <p className="text-slate-500 mt-2">
                            监控 Helix Text-to-SQL 自动化测试基础设施
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={loadData}
                            className="px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors"
                        >
                            ↻ 刷新
                        </button>
                        <button
                            onClick={handleRunAll}
                            disabled={isGlobalRunning || loading}
                            className={`
                                px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all
                                ${isGlobalRunning
                                    ? 'bg-indigo-500 text-white cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white'
                                }
                            `}
                        >
                            {isGlobalRunning ? (
                                <><span className="animate-spin text-lg">⟳</span> 执行中...</>
                            ) : (
                                <><span className="text-lg">▶</span> 全部执行</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <StatCard title="总用例数" value={stats.totalCases} isGood={true} />
                    <StatCard title="通过率" value="--" trend="N/A" isGood={true} />
                    <StatCard title="日执行次数" value={stats.dailyExecutions} />
                    <StatCard title="需修复问题" value={stats.activeIssues} trend="0" isGood={true} />
                </div>

                {/* Recent Test Runs */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-lg">测试用例列表 (Text-to-SQL)</h3>
                        <Tooltip title="从后端同步">
                            <span className="text-xs text-slate-400">已连接: localhost:8000</span>
                        </Tooltip>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500">
                                    <th className="px-8 py-4 font-semibold">ID</th>
                                    <th className="px-6 py-4 font-semibold">自然语言问题 (Question)</th>
                                    <th className="px-6 py-4 font-semibold">类型</th>
                                    <th className="px-6 py-4 font-semibold">预期关键字</th>
                                    <th className="px-6 py-4 font-semibold">执行状态</th>
                                    <th className="px-6 py-4 font-semibold text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-8 py-5" colSpan={6}><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                                        </tr>
                                    ))
                                ) : cases.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="h-64 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <span className="text-4xl mb-4 opacity-20">📭</span>
                                                <p>暂无测试用例</p>
                                                <p className="text-xs mt-2 opacity-60">请检查数据库或导入数据</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    cases.map((testCase) => (
                                        <tr key={testCase.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-4 font-mono text-slate-400">#{testCase.id}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 max-w-md truncate" title={testCase.question}>
                                                {testCase.question}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-[10px] px-2 py-1 rounded font-bold bg-indigo-50 text-indigo-600">
                                                    SQL-GEN
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-xs truncate">
                                                {testCase.expected_keywords || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={testCase.status} result={testCase.lastResult} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(testCase)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-all"
                                                >
                                                    配置
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Custom Drawer Implementation */}
            <Drawer
                title={<span className="font-bold text-slate-800">用例详情 #{selectedCase?.id}</span>}
                placement="right"
                width={500}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                styles={{ header: { borderBottom: '1px solid #f1f5f9' }, body: { backgroundColor: '#f8fafc' } }}
            >
                {selectedCase && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">基本信息</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">自然语言问题</label>
                                    <p className="text-sm font-medium text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">
                                        {selectedCase.question}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">预期关键字</label>
                                        <code className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs block">
                                            {selectedCase.expected_keywords || '无'}
                                        </code>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">状态</label>
                                        <StatusBadge status={selectedCase.status} result={selectedCase.lastResult} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {selectedCase.lastResult && (
                            <div className={`p-4 rounded-xl border ${selectedCase.lastResult === 'PASS' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${selectedCase.lastResult === 'PASS' ? 'text-green-700' : 'text-red-700'}`}>
                                    执行结果: {selectedCase.lastResult}
                                </h4>
                                {selectedCase.lastError && (
                                    <p className="text-xs font-mono text-slate-600 break-all">
                                        {selectedCase.lastError}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 px-2 py-1 bg-slate-100 text-[10px] text-slate-500 rounded-bl-lg font-mono">Raw Data</div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">完整 JSON 数据</h4>
                            <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-4 rounded-lg overflow-x-auto border border-slate-100 leading-relaxed">
                                {JSON.stringify(selectedCase, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
