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
  desktop_scan_job_id: string;
  mobile_scan_job_id: string;
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

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardScores {
  accessibility: number | null;
  performance: number | null;
  quality: number | null;
  seo: number | null;
}

export interface DashboardIssuesSummary {
  total: number;
  critical: number;
}

export interface DashboardIssuesByCategory {
  accessibility: number;
  performance: number;
  quality: number;
  seo: number;
}

export interface DashboardResponse {
  scan_job_id: string;
  website_url: string;
  scanned_at: string;
  status: string;
  scores: DashboardScores;
  issues_summary: DashboardIssuesSummary;
  issues_by_category: DashboardIssuesByCategory;
  scanned_pages: string[];
}

export interface CancelScanResponse {
  scan_job_id: string;
  status: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export interface PerformanceScoreResponse {
  score: number | null;
  score_change_percent: number | null;
  total_issues: number;
  total_issues_change_percent: number | null;
  critical_issues: number;
  critical_issues_change_percent: number | null;
  avg_response_time_ms: number | null;
  avg_response_time_change_percent: number | null;
}

export interface VitalPageItem {
  page_url: string;
  fcp_ms: number | null;
  lcp_ms: number | null;
  tbt_ms: number | null;
  cls: number | null;
  speed_index_ms: number | null;
}

export interface VitalsResponse {
  pages: VitalPageItem[];
}

export interface CriticalIssueItem {
  rule_id: string;
  title: string;
  pages_affected: number;
}

export interface PerformanceCriticalIssuesResponse {
  items: CriticalIssueItem[];
}

export interface TopAffectedPageItem {
  page_url: string;
  name: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  performance_score: number | null;
}

export interface TopAffectedPagesResponse {
  items: TopAffectedPageItem[];
}

export interface AffectedPageItem {
  page_url: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  page_score: number | null;
}

export interface AffectedPagesResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AffectedPageItem[];
}

export interface PerformanceIssueListItem {
  id: string;
  rule_id: string;
  title: string;
  description: string | null;
  learn_more_url: string | null;
  pages_affected: number;
  priority: string;
}

export interface PerformanceIssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: PerformanceIssueListItem[];
}

// ---------------------------------------------------------------------------
// Quality / SEO (shared shapes)
// ---------------------------------------------------------------------------

export interface CategoryScoreResponse {
  score: number | null;
  label: string;
  total_issues: number;
  critical_issues: number;
}

export interface CategoryCriticalIssueItem {
  rule_id: string;
  title: string;
  pages_affected: number;
}

export interface CategoryCriticalIssuesResponse {
  total: number;
  items: CategoryCriticalIssueItem[];
}

export interface CategoryTopAffectedPageItem {
  page_url: string;
  title: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  page_score: number | null;
}

export interface CategoryTopAffectedPagesResponse {
  items: CategoryTopAffectedPageItem[];
}

export interface CategoryAffectedPageItem {
  page_url: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  page_score: number | null;
}

export interface CategoryAffectedPagesResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: CategoryAffectedPageItem[];
}

export interface CategoryIssueListItem {
  id: string;
  rule_id: string;
  title: string;
  description: string | null;
  learn_more_url: string | null;
  pages_affected: number;
  priority: string;
}

export interface CategoryIssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: CategoryIssueListItem[];
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export interface AccessibilityScoreResponse {
  score: number | null;
  score_change_percent: number | null;
  wcag_level: string;
  level_a_score: number | null;
  level_aa_score: number | null;
  total_issues: number;
  previous_total_issues: number | null;
  critical_issues: number;
  previous_critical_issues: number | null;
}

export interface AccessibilityCommonIssueItem {
  rule_id: string;
  title: string;
  pages_affected: number;
}

export interface AccessibilityCommonIssuesResponse {
  total_issues: number;
  items: AccessibilityCommonIssueItem[];
}

export interface AccessibilityWcagSummaryResponse {
  wcag_version: string;
  passed_audits: number;
  needs_review_count: number;
  not_applicable_count: number;
}

export interface AccessibilityIssuesLogItem {
  issue_id: string;
  title: string;
  page_url: string;
  wcag_level: string | null;
  priority: string;
}

export interface AccessibilityIssuesLogResponse {
  total: number;
  items: AccessibilityIssuesLogItem[];
}

export interface AccessibilityPagesListItem {
  page_url: string;
  score: number | null;
  priority: string | null;
  critical_issues: number;
  total_issues: number;
}

export interface AccessibilityPagesListResponse {
  items: AccessibilityPagesListItem[];
}

export interface AccessibilityManualCheckPage {
  screenshot: string | null;
  page_url: string;
  failed_elements: string[];
  priority: string;
}

export interface AccessibilityManualCheckItem {
  rule_id: string;
  title: string;
  issue_count: number;
  wcag_level: string | null;
  description: string | null;
  learn_more_url: string | null;
  impact: string | null;
  pages: AccessibilityManualCheckPage[];
}

export interface AccessibilityManualChecksResponse {
  items: AccessibilityManualCheckItem[];
}

export interface RequiredManualCheckPage {
  outcome_id: string;
  screenshot: string | null;
  page_url: string;
  is_resolved: boolean;
}

export interface RequiredManualCheckItem {
  audit_id: string;
  title: string;
  issue_count: number;
  wcag_level: string | null;
  description: string | null;
  how_to_test: string | null;
  is_resolved: boolean;
  pages: RequiredManualCheckPage[];
}

export interface RequiredManualChecksResponse {
  items: RequiredManualCheckItem[];
}

export interface ResolveOutcomeResponse {
  outcome_id: string;
  is_resolved: boolean;
}

export interface ChecklistCriterionItem {
  criterion: string;
  description: string;
  level: string;
  instruction: string | null;
  pages_affected: number;
  outcome: string;
}

export interface ChecklistGuidelineItem {
  guideline: string;
  title: string;
  criteria: ChecklistCriterionItem[];
}

export interface ChecklistPrincipleItem {
  principle: number;
  title: string;
  guidelines: ChecklistGuidelineItem[];
}

export interface AccessibilityChecklistResponse {
  wcag_version: string;
  items: ChecklistPrincipleItem[];
}

// ---------------------------------------------------------------------------
// Performance — response times + filmstrip
// ---------------------------------------------------------------------------

export interface ResponseTimeItem {
  page_url: string;
  title: string;
  response_time_ms: number | null;
}

export interface ResponseTimesResponse {
  pages: ResponseTimeItem[];
}

export interface FilmstripFrame {
  timing: number;
  data: string;
}

export interface FilmstripPageItem {
  page_url: string;
  frames: FilmstripFrame[];
}

export interface FilmstripResponse {
  pages: FilmstripPageItem[];
}

// ---------------------------------------------------------------------------
// Accessibility — issues per page
// ---------------------------------------------------------------------------

export interface AccessibilityIssuesPerPageItem {
  page_url: string;
  issue_count: number;
  critical_count: number;
  screenshot: string | null;
}

export interface AccessibilityIssuesPerPageResponse {
  items: AccessibilityIssuesPerPageItem[];
}

// ---------------------------------------------------------------------------
// Guest scan
// ---------------------------------------------------------------------------

export interface GuestScanPendingResponse {
  guest_scan_id: string;
  status: 'pending';
}

export interface GuestScanScore {
  score: number | null;
  title: string;
  description: string;
}

export interface GuestScanMetric {
  value: number | null;
  display_value: string;
  score: number | null;
}

export interface GuestScanSummary {
  total: number;
  passed: number;
  critical: number;
  non_critical: number;
}

export interface GuestScanData {
  url: string;
  fetch_time: string;
  strategy: string;
  scores: Record<string, GuestScanScore>;
  metrics: Record<string, GuestScanMetric>;
  summary: GuestScanSummary;
}

export interface GuestScanStatusResponse {
  status: 'pending' | 'complete' | 'error';
  data: GuestScanData | null;
  message: string | null;
}
