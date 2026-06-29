export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string;
  created_at: string;
  last_scanned_at: string | null;
}

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ScanStrategy = 'mobile' | 'desktop';

export interface PageProgress {
  url: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface ScanJobProgress {
  total: number;
  done: number;
  failed: number;
  running: number;
  pending: number;
}

// Matches backend ScanJobStatusResponse
export interface ScanJob {
  scan_job_id: string;
  status: ScanStatus;
  strategy: ScanStrategy;
  created_at: string;
  completed_at: string | null;
  progress: ScanJobProgress;
  pages: PageProgress[];
}

// Matches backend TriggerScanResponse
export interface TriggerScanResponse {
  scan_job_id: string;
  status: string;
  message: string;
}

// Matches backend ScanHistoryV2Item
export interface ScanHistoryItem {
  scan_job_id: string;
  scanned_at: string;
  mode: string;
  status: ScanStatus;
  pages_scanned: number;
  issues_detected: number;
  can_download: boolean;
}

export interface ScoreDataPoint {
  scanned_at: string;
  score: number | null;
}

export interface ScoreOverTimeResponse {
  data_points: ScoreDataPoint[];
}

// Matches backend ScanSummaryResponse
export interface CategoryScoreStats {
  min: number;
  max: number;
  avg: number;
}

export interface WorstPage {
  url: string;
  overall_score: number;
}

export interface CommonCriticalAudit {
  id: string;
  title: string;
  affected_pages: number;
  affected_percent: number;
}

export interface ScanSummaryResponse {
  scan_job_id: string;
  status: string;
  total_pages: number;
  passed_pages: number;
  failed_pages: number;
  scores: Record<string, CategoryScoreStats>;
  worst_pages: WorstPage[];
  common_critical_audits: CommonCriticalAudit[];
}

export type IssueCategory = 'performance' | 'accessibility' | 'best_practices' | 'seo';
export type IssueSeverity = 'critical' | 'non_critical';
export type IssuePriority = 'low' | 'medium' | 'high';
export type DetailsType = 'opportunity' | 'table' | 'list' | 'numeric' | 'criticalrequestchain' | 'n/a';

export interface Issue {
  id: string;
  scan_result_id: string;
  scan_job_id: string;
  category: IssueCategory;
  rule_id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  score: number;
  display_value: string | null;
  details_type: DetailsType;
  wcag_version: string | null;
  wcag_criterion: string | null;
  priority: IssuePriority;
  item_count: number | null;
  wasted_ms: number | null;
  wasted_bytes: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// Matches backend PageScoreResponse
export interface PageScore {
  scan_result_id: string;
  page_url: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
}

export interface PageMetrics {
  fcp_ms: number | null;
  lcp_ms: number | null;
  tbt_ms: number | null;
  cls: number | null;
  speed_index_ms: number | null;
  tti_ms: number | null;
}

export interface PageVitals {
  page_url: string;
  performance_score: number | null;
  metrics: PageMetrics;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}
