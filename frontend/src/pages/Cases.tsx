import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus, MoreHorizontal, Play, Trash2, Edit, ExternalLink } from 'lucide-react';
import { casesService } from '../services/cases';
import { TestCase } from '../types';
import { useRunnerStore } from '../stores/useRunnerStore';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Button,
  Tag,
  Dropdown,
  Menu,
  Popover,
  Checkbox,
  message,
  Modal,
  Space,
  Empty,
  Select,
  Spin
} from 'antd';

const Cases: React.FC = () => {
  const [cases, setCases] = useState<TestCase[]>([]);
  const [displayCases, setDisplayCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter states
  const [filters, setFilters] = useState({
    modules: [] as string[],
    priorities: [] as string[],
    status: 'all' as 'all' | 'active' | 'inactive'
  });

  const startRun = useRunnerStore(state => state.startRun);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await casesService.getCases();
      setCases(data);
      setDisplayCases(data);
    } catch (e) {
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. Search Debounce Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFilter(searchText, filters);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, filters, cases]);

  const handleFilter = (q: string, f: typeof filters) => {
    let filtered = cases;

    // Search filter
    if (q) {
      const lowQ = q.toLowerCase();
      filtered = filtered.filter(c =>
        c.id.toString().includes(lowQ) ||
        c.question.toLowerCase().includes(lowQ)
      );
    }

    // Module filter
    if (f.modules.length > 0) {
      filtered = filtered.filter(c => c.module && f.modules.includes(c.module));
    }

    // Priority filter
    if (f.priorities.length > 0) {
      filtered = filtered.filter(c => c.priority && f.priorities.includes(c.priority));
    }

    // Status filter
    if (f.status !== 'all') {
      filtered = filtered.filter(c => f.status === 'active' ? c.is_active : !c.is_active);
    }

    setDisplayCases(filtered);
  };

  // 3. Global Execute Button Logic
  const handleRunBatch = async () => {
    const ids = selectedIds.length > 0 ? selectedIds : displayCases.map(c => c.id);

    if (ids.length === 0) {
      message.warning("请选择要执行的用例或应用筛选条件");
      return;
    }

    try {
      setLoading(true);
      const { runnerService } = await import('../services/runner');
      const { batch_id } = await runnerService.runTests(ids);

      const casesToRun = cases.filter(c => ids.includes(c.id));
      startRun(casesToRun, batch_id);
      navigate('/runner');
    } catch (e: any) {
      message.error("启动失败: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Delete Logic
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除?',
      content: '删除后无法恢复，请确认此操作。',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await casesService.deleteCase(id);
          message.success("删除成功");
          loadData();
        } catch (e: any) {
          message.error("删除失败: " + e.message);
        }
      }
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayCases.map(c => c.id));
    }
  };

  // 2. Filter Button Content
  const uniqueModules = Array.from(new Set(cases.map(c => c.module).filter(Boolean))) as string[];

  const filterContent = (
    <div className="p-2 space-y-4 w-64">
      {uniqueModules.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">业务模块</div>
          <Checkbox.Group
            options={uniqueModules}
            value={filters.modules}
            onChange={(v) => setFilters(prev => ({ ...prev, modules: v as string[] }))}
            className="flex flex-col gap-1 max-h-32 overflow-y-auto"
          />
        </div>
      )}
      <div>
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">优先级</div>
        <Checkbox.Group
          options={['P0', 'P1', 'P2']}
          value={filters.priorities}
          onChange={(v) => setFilters(prev => ({ ...prev, priorities: v as string[] }))}
          className="flex flex-col gap-1"
        />
      </div>
      <div>
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">状态</div>
        <Select
          value={filters.status}
          style={{ width: '100%' }}
          onChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '仅启用', value: 'active' },
            { label: '仅禁用', value: 'inactive' },
          ]}
        />
      </div>
      <div className="pt-2 border-t border-slate-100 flex justify-end">
        <Button size="small" type="link" onClick={() => setFilters({ modules: [], priorities: [], status: 'all' })}>
          重置筛选
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">用例管理</h1>
          <Tag color="blue" className="rounded-full px-2" bordered={false}>
            {cases.length} Total
          </Tag>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<Play size={16} />}
            className="bg-green-600 hover:bg-green-700 border-none flex items-center h-10 px-6 rounded-xl"
            onClick={handleRunBatch}
            loading={loading}
          >
            执行测试 {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            className="bg-blue-600 hover:bg-blue-700 border-none flex items-center h-10 px-6 rounded-xl shadow-lg shadow-blue-500/20"
            onClick={() => navigate('/cases/new')}
          >
            新建用例
          </Button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-4 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
          <Input
            placeholder="搜索用例 ID 或名称..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            variant="borderless"
            className="w-full pl-12 h-11 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl transition-all"
          />
        </div>

        <Popover content={filterContent} title="用例筛选" trigger="click" placement="bottomRight">
          <Button
            icon={<Filter size={16} />}
            className="flex items-center gap-2 h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200"
          >
            筛选
          </Button>
        </Popover>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading && cases.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center">
            <Spin size="large" />
            <span className="mt-4 text-slate-400">正在获取测试用例库...</span>
          </div>
        ) : displayCases.length === 0 ? (
          <div className="p-24">
            <Empty description="未找到匹配的测试用例" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 w-12 text-center">
                    <Checkbox
                      checked={selectedIds.length === displayCases.length && displayCases.length > 0}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < displayCases.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest w-16">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">用例名称 / 意图</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">模块</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">优先级</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">状态</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-4 text-center">
                      <Checkbox
                        checked={selectedIds.includes(tc.id)}
                        onChange={() => toggleSelect(tc.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-400">#{tc.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800 line-clamp-2">{tc.question}</div>
                    </td>
                    {/* 4. Column Rendering: Module */}
                    <td className="px-6 py-4">
                      {tc.module ? (
                        <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50">
                          {tc.module}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    {/* 4. Column Rendering: Priority */}
                    <td className="px-6 py-4">
                      <Tag
                        bordered={false}
                        className="rounded-lg px-2 font-bold"
                        color={tc.priority === 'P0' ? 'error' : tc.priority === 'P1' ? 'warning' : 'success'}
                      >
                        {tc.priority || 'P2'}
                      </Tag>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${tc.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></span>
                        <span className={`text-sm ${tc.is_active ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                          {tc.is_active ? '启用' : '禁用'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* 5. Action Menu */}
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'edit',
                              label: '编辑用例',
                              icon: <Edit size={14} />,
                              onClick: () => navigate(`/cases/${tc.id}`)
                            },
                            {
                              key: 'run',
                              label: '单条执行',
                              icon: <Play size={14} className="text-green-500" />,
                              onClick: () => { startRun([tc], 'manual'); navigate('/runner'); }
                            },
                            {
                              key: 'detail',
                              label: '查看详情',
                              icon: <ExternalLink size={14} />
                            },
                            { type: 'divider' },
                            {
                              key: 'delete',
                              label: '删除用例',
                              danger: true,
                              icon: <Trash2 size={14} />,
                              onClick: () => handleDelete(tc.id)
                            },
                          ]
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <Button type="text" className="text-slate-400 hover:text-slate-600" icon={<MoreHorizontal size={20} />} />
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cases;