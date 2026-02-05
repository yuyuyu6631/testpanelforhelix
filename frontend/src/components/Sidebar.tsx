import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Play, FileText, Database, Settings, Sparkles, X, Code } from 'lucide-react';

const Sidebar: React.FC<{ isOpen: boolean; setIsOpen: (v: boolean) => void }> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/cases', icon: Database, label: '用例管理' },
    { path: '/templates', icon: Code, label: '接口定义' },
    { path: '/runner', icon: Play, label: '执行控制台' },
    { path: '/reports', icon: FileText, label: '测试报告' },
    { path: '/generator', icon: Sparkles, label: '智能生成' },
    { path: '/settings', icon: Settings, label: '系统设置' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="font-bold text-white">H</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Helix<span className="text-blue-400">Auto</span></span>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)} // Close on mobile click
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}
                `}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">Admin User</span>
              <span className="text-xs text-slate-500">v4.0.0-release</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;