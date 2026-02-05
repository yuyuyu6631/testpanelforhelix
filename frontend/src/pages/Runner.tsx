import React, { useEffect, useRef } from 'react';
import { useRunnerStore } from '../stores/useRunnerStore';
import { CaseStatus, TestCase } from '../types';
import { Play, Square, Terminal, CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const Runner: React.FC = () => {
  const { isRunning, progress, logs, activeBatchId, runtimeCases, stopRun, addLog, updateCaseStatus, updateProgress } = useRunnerStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Real WebSocket Logic
  useEffect(() => {
    if (!activeBatchId || !isRunning) return;

    // Connect WS
    const host = window.location.hostname;
    const wsUrl = `ws://${host}:8001/run/ws/${activeBatchId}`;
    console.log("Connecting WS:", wsUrl);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      addLog(`已连接到实时日志流: ${activeBatchId}`, 'INFO');
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Message types: init, running, update, batch_status, done

        if (msg.type === 'running') {
          updateCaseStatus(msg.case_id, CaseStatus.RUNNING);
        } else if (msg.type === 'update') {
          // msg.result: { case_id, result: PASS/FAIL, message, ... }
          // Map backend result to frontend status
          const status = msg.result.result === 'PASS' ? CaseStatus.PASS : CaseStatus.FAIL;
          updateCaseStatus(msg.case_id, status);
          const logLvl = status === CaseStatus.PASS ? 'INFO' : 'ERROR';
          addLog(`[${status}] #${msg.case_id}: ${msg.result.message || 'Done'}`, logLvl);
        } else if (msg.type === 'batch_status') {
          // msg.total, msg.completed
          if (msg.total > 0) {
            const p = Math.round((msg.completed / msg.total) * 100);
            updateProgress(p);
          }
        } else if (msg.type === 'log') {
          // Generic log
          addLog(msg.message, msg.level || 'INFO');
        } else if (msg.type === 'done') {
          stopRun();
          addLog("测试执行完成。", "INFO");
          socket.close();
        }

      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    socket.onerror = (e) => {
      console.error("WS Error", e);
      addLog("WebSocket 连接错误", "ERROR");
    };

    socket.onclose = () => {
      console.log("WS Closed");
    };

    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBatchId]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="text-slate-500" />
            执行控制台
          </h1>
          <p className="text-sm text-slate-500 font-mono mt-1">批次 ID: {activeBatchId || 'IDLE'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-64">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-600">进度</span>
              <span className="text-blue-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          {isRunning ? (
            <button onClick={stopRun} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-medium transition-colors">
              <Square size={18} fill="currentColor" />
              停止
            </button>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg font-medium text-sm">
              等待任务
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">

        {/* Left: Case List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-semibold text-slate-700">执行队列</h3>
            <span className="text-xs font-mono text-slate-500">{runtimeCases.length} 项</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
            {runtimeCases.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Play size={48} className="mb-4 opacity-20" />
                <p>队列为空。请从用例管理页面选择用例执行。</p>
              </div>
            )}
            {runtimeCases.map((tc) => (
              <div key={tc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-300 bg-white transition-all">
                <div className="flex items-center gap-3">
                  {getStatusIcon(tc.status)}
                  <div>
                    <div className="text-sm font-medium text-slate-900">{tc.question}</div>
                    <div className="text-xs text-slate-500 font-mono">ID: {tc.id} • {tc.module}</div>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  {tc.status === CaseStatus.RUNNING ? '运行中...' : tc.status === CaseStatus.WAITING ? '等待中' : '完成'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Logs */}
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              实时日志流 (WebSocket)
            </span>
          </div>
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 custom-scrollbar"
          >
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span className={clsx("break-all", {
                  'text-blue-400': log.level === 'INFO',
                  'text-red-400': log.level === 'ERROR',
                  'text-yellow-400': log.level === 'WARN',
                  'text-slate-400': log.level === 'DEBUG',
                })}>
                  {log.message}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <span className="text-slate-600 italic">等待执行流...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusIcon = (status?: CaseStatus) => {
  switch (status) {
    case CaseStatus.PASS: return <CheckCircle2 size={18} className="text-green-500" />;
    case CaseStatus.FAIL: return <XCircle size={18} className="text-red-500" />;
    case CaseStatus.RUNNING: return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    default: return <Clock size={18} className="text-slate-300" />;
  }
};

export default Runner;