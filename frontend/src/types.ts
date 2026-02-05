export enum CaseStatus {
  IDLE = 'IDLE',
  WAITING = 'WAITING',
  RUNNING = 'RUNNING',
  PASS = 'PASS',
  FAIL = 'FAIL'
}

// Matches API: GET /cases
export interface TestCase {
  id: number;
  question: string;         // Previously name
  module: string;           // Kept for UI organization, assumed supported or mapped
  priority: 'P0' | 'P1' | 'P2';
  expected_keywords?: string; // API field
  expected_sql?: string;      // Assumed field for Diff view
  is_active: boolean;       // Previously isEnabled
  last_run?: string;
  status?: CaseStatus;      // Runtime status
}

// Matches API: GET /reports
export interface TestBatch {
  id: string;
  start_time: string;
  total_count: number;
  pass_count: number;
  fail_count: number; // inferred helper
  status: 'COMPLETED' | 'IN_PROGRESS';
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

// Matches API: GET /reports/{id}/details
export interface ReportDetail {
  case_id: number;
  question: string;
  duration: number; // ms
  result: CaseStatus; // Matches 'result' field in API doc
  actual_sql: string;
  expected_sql: string; // Needed for diff
  message?: string;
  diff_score: number;
}

// Config Types
export interface SystemConfig {
  user_token: string;
  max_workers: number;
  headers?: Record<string, string>;
}

// Gemini Types
export interface GeneratedCaseSchema {
  question: string;
  module: string;
  description: string;
  expected_sql: string;
}