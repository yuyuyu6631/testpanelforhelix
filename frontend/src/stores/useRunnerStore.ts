import { create } from 'zustand';
import { CaseStatus, LogEntry, TestCase } from '../types';

interface RunnerState {
  isRunning: boolean;
  progress: number;
  logs: LogEntry[];
  activeBatchId: string | null;
  runtimeCases: TestCase[];

  // Actions
  startRun: (cases: TestCase[], batchId?: string) => void;
  stopRun: () => void;
  addLog: (message: string, level?: LogEntry['level']) => void;
  updateCaseStatus: (id: number, status: CaseStatus) => void;
  updateProgress: (progress: number) => void;
  reset: () => void;
}

export const useRunnerStore = create<RunnerState>((set) => ({
  isRunning: false,
  progress: 0,
  logs: [],
  activeBatchId: null,
  runtimeCases: [],

  startRun: (cases, batchId) => set({
    isRunning: true,
    progress: 0,
    logs: [],
    activeBatchId: batchId || `BATCH-${Date.now()}`,
    runtimeCases: cases.map(c => ({ ...c, status: CaseStatus.WAITING }))
  }),

  stopRun: () => set({ isRunning: false }),

  addLog: (message, level = 'INFO') => set((state) => ({
    logs: [...state.logs, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    }]
  })),

  updateCaseStatus: (id, status) => set((state) => ({
    runtimeCases: state.runtimeCases.map(c =>
      c.id === id ? { ...c, status } : c
    )
  })),

  updateProgress: (progress) => set({ progress }),

  reset: () => set({ isRunning: false, progress: 0, logs: [], activeBatchId: null, runtimeCases: [] })
}));