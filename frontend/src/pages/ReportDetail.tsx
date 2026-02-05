
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsService } from '@/services/reports';
import type { ReportDetail, CaseStatus as CaseStatusType } from '@/types';
import { CaseStatus } from '@/types';
import { ArrowLeft, CheckCircle2, XCircle, Code } from 'lucide-react';

const ReportDetail: React.FC = () => {
  const { id } = useParams();
  const [details, setDetails] = useState<ReportDetail[]>([]);
  const [selectedCase, setSelectedCase] = useState<ReportDetail | null>(null);

  useEffect(() => {
    if (id) {
      reportsService.getReportDetails(id).then(data => {
        setDetails(data);
        if (data.length > 0) setSelectedCase(data[0]);
      });
    }
  }, [id]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <Link to="/reports" className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">批次报告: {id}</h1>
            <p className="text-xs text-slate-500">详细回归分析与 SQL 差异对比</p>
          </div>
          <button
            onClick={() => {
              if (id) {
                reportsService.exportReport(id).then((response: any) => {
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `report_${id}.xlsx`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }).catch(() => alert("导出失败"));
              }
            }}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            导出 Excel
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Left: Case List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-700">测试用例</h3>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {details.map((item) => (
              <div
                key={item.case_id}
                onClick={() => setSelectedCase(item)}
                className={`
p - 4 border - b border - slate - 100 cursor - pointer transition - colors hover: bg - slate - 50
                    ${selectedCase?.case_id === item.case_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}
`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm text-slate-800 truncate pr-2">{item.question}</span>
                  {item.result === CaseStatus.PASS ? (
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-500 shrink-0" />
                  )}
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>耗时: {item.duration}ms</span>
                  <span>差异分: {item.diff_score * 100}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Diff View */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
          {selectedCase ? (
            <>
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Code size={18} />
                  SQL 执行分析
                </h3>
                <div className={`px - 3 py - 1 rounded - full text - xs font - bold ${selectedCase.result === CaseStatus.PASS ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} `}>
                  {selectedCase.result}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Expected */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">预期 SQL / 结果</span>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedCase.expected_sql}
                  </div>
                </div>

                {/* Actual */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">实际 SQL / 结果</span>
                  <div className={`
p - 4 rounded - lg border font - mono text - sm whitespace - pre - wrap
                      ${selectedCase.result === CaseStatus.FAIL ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}
`}>
                    {selectedCase.actual_sql}
                  </div>
                </div>

                {selectedCase.result === CaseStatus.FAIL && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-bold text-yellow-800 mb-1">差异分析</h4>
                    <p className="text-sm text-yellow-700">
                      {selectedCase.message || "检测到 WHERE 子句条件不匹配。预期包含 `status = 1` 但执行语句中缺失约束。"}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              请选择用例查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;