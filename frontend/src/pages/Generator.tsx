import React, { useState, useEffect } from 'react';
import { Database, Loader2, PlayCircle, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { generatorService, type GeneratorMetadata } from '../services/generator';
import { message } from 'antd';

const Generator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<GeneratorMetadata | null>(null);
  const [genResult, setGenResult] = useState<{ generated: number; message: string } | null>(null);

  const loadMetadata = async () => {
    try {
      const data = await generatorService.getMetadata();
      setMetadata(data);
    } catch (e: any) {
      message.error('加载元数据失败: ' + e.message);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setGenResult(null);
    try {
      const result = await generatorService.generateCases(3);
      setGenResult(result);
      message.success(result.message);
    } catch (e: any) {
      message.error('生成失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Database className="text-blue-500" />
          自动化用例生成
        </h1>
        <p className="text-slate-500">
          基于业务数据库中的指标和公司元数据，自动构建结构化的 SQL 测试用例。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metadata Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Info size={18} className="text-blue-400" />
              数据源状态
            </h3>
            <button
              onClick={loadMetadata}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
              title="刷新元数据"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {metadata ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wider mb-1">指标总数</div>
                  <div className="text-2xl font-bold text-blue-900">{metadata.indicator_count ?? 0}</div>
                </div>
                <div className="flex-1 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div className="text-xs text-indigo-600 font-medium uppercase tracking-wider mb-1">公司总数</div>
                  <div className="text-2xl font-bold text-indigo-900">{metadata.company_count ?? 0}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">部分指标示例:</div>
                <div className="flex flex-wrap gap-2">
                  {metadata.sample_indicators?.map((ind, i) => (
                    <span key={`ind-${i}`} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                      {ind}
                    </span>
                  )) || <span className="text-slate-400 text-xs text-italic">暂无指标示例</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-4 flex justify-center">
              <Loader2 className="animate-spin text-slate-300" />
            </div>
          )}
        </div>

        {/* Generate Action Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white space-y-6 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <PlayCircle size={18} className="text-blue-400" />
              生成引擎
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              引擎将交叉匹配所有处于启用状态的指标和代表性公司，每个组合将生成多条针对性测试问句。
            </p>
          </div>

          <div className="space-y-4">
            {genResult && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3 animate-in zoom-in duration-300">
                <CheckCircle2 size={18} className="text-blue-400 flex-shrink-0" />
                <span className="text-sm text-blue-100 font-medium">{genResult.message}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || !metadata}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Database size={20} />}
              立即自动生成用例
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
        <Info className="text-amber-500 flex-shrink-0" size={20} />
        <div className="text-sm text-amber-800 leading-relaxed">
          <p className="font-semibold mb-1">关于 AI 生成功能</p>
          目前优先恢复稳定可靠的数据库全量生成模式。基于自然语言的 AI 生成功能暂时搁置，将在后续版本中通过集成大模型服务重新上线。
        </div>
      </div>
    </div>
  );
};

export default Generator;