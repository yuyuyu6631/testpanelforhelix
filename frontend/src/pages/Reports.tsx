import React, { useEffect, useState } from 'react';
import { reportsService } from '../services/reports';
import { TestBatch } from '../types';
import { FileText, ChevronRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Reports: React.FC = () => {
  const [batches, setBatches] = useState<TestBatch[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    reportsService.getReports().then(setBatches);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">执行报告</h1>
        <p className="text-slate-500 mt-1">历史测试批次存档</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">批次 ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">开始时间</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">状态</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">结果 (通/挂)</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-blue-600 font-medium">{batch.id}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{batch.start_time}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    {batch.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 font-semibold">{batch.pass_count}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-red-600 font-semibold">{batch.fail_count}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-3">
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => navigate(`/reports/${batch.id}`)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    详情
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;