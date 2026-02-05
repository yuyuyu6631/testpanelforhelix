import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Runner from './pages/Runner';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Generator from './pages/Generator';

import Settings from './pages/Settings';
import TemplateList from './pages/templates/List';
import TemplateEdit from './pages/templates/Edit';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <main className="flex-1 lg:ml-64 min-w-0 flex flex-col transition-all duration-300">
          {/* Mobile Header */}
          <div className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 sticky top-0 z-20">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
              <Menu size={24} />
            </button>
            <span className="ml-3 font-bold text-lg">Helix AutoTest</span>
          </div>

          <div className="flex-1 p-4 lg:p-8 overflow-y-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/runner" element={<Runner />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:id" element={<ReportDetail />} />
              <Route path="/generator" element={<Generator />} />
              <Route path="/templates" element={<TemplateList />} />
              <Route path="/templates/new" element={<TemplateEdit />} />
              <Route path="/templates/:id" element={<TemplateEdit />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;