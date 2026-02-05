import React, { useEffect, useState } from 'react';
import { Save, Server, Shield } from 'lucide-react';
import { configService } from '../services/config';
import { SystemConfig } from '../types';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({ user_token: '', max_workers: 1, headers: {} });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    configService.getConfig().then(setConfig);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await configService.updateConfig(config);
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">系统配置</h1>
        <p className="text-slate-500 mt-1">管理 API 连接、并发控制与安全令牌。</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Shield size={20} className="text-blue-500" />
            认证信息
          </h3>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">User Token</label>
            <input
              type="password"
              value={config.user_token}
              onChange={e => setConfig({ ...config, user_token: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-slate-500">用于访问后端 API 的 JWT 令牌。</p>
          </div>
        </div>

        <div className="border-t border-slate-100 my-4"></div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Server size={20} className="text-purple-500" />
            运行参数
          </h3>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-700">最大并发数 (Workers)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="20"
                value={config.max_workers}
                onChange={e => setConfig({ ...config, max_workers: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-bold w-8">{config.max_workers}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-all
              ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {saved ? (
              <>已保存</>
            ) : (
              <>
                <Save size={18} /> 保存配置
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Settings;