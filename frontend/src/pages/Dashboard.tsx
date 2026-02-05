import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

const data = [
  { name: 'Auth', passed: 40, failed: 2 },
  { name: 'Payment', passed: 30, failed: 5 },
  { name: 'Inventory', passed: 55, failed: 1 },
  { name: 'Search', passed: 25, failed: 0 },
  { name: 'Profile', passed: 18, failed: 2 },
];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
          <p className="text-slate-500 mt-1">测试执行健康度与稳定性概览</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">系统运行中</span>
           <span className="text-xs text-slate-400">更新时间: 刚刚</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">总用例数</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">1,284</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity size={20} />
          </div>
        </div>
        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">通过率</p>
            <h3 className="text-2xl font-bold text-green-600 mt-1">96.8%</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
        </div>
        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">失败数</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">12</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <XCircle size={20} />
          </div>
        </div>
        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">平均耗时</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">4m 32s</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">模块稳定性趋势</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="passed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} name="通过" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="失败" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">执行结果分布</h3>
          <div className="h-80 w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Passed', value: 940 },
                    { name: 'Failed', value: 50 },
                    { name: 'Skipped', value: 10 },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#22c55e', '#ef4444', '#94a3b8'][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-slate-600">通过</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-slate-600">失败</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;