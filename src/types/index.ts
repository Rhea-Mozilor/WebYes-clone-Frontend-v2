export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  plan?: string;
}

export interface Website {
  id: string;
  user_id: string;
  name: string;
  url: string;
  created_at: string;
  last_scanned_at: string | null;
  organisation_id: string | null;
}

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ScanStrategy = 'mobile' | 'desktop';

export interface ScannedPage {
  url: string;
  scanned_at: string;
}

// Matches backend ScanJobStatusResponse
export interface ScanJob {
  scan_job_id: string;
  status: ScanStatus;
  strategy: ScanStrategy;
  created_at: string;
  completed_at: string | null;
  pages_scanned: number;
  current_url: string | null;
  pages: ScannedPage[];
  // Present when status is 'failed' or 'cancelled' — the backend's explanation.
  message?: string;
}

// Matches backend TriggerScanResponse (new: dual-job; legacy: single scan_job_id)
export interface TriggerScanResponse {
  desktop_scan_job_id?: string;
  mobile_scan_job_id?: string;
  scan_job_id?: string; // legacy backend
  status: string;
  message: string;
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

export type IssueCategory = 'performance' | 'accessibility' | 'best_practices' | 'quality' | 'seo';
export type IssueSeverity = 'critical' | 'non_critical';
export type IssuePriority = 'low' | 'medium' | 'high';
export type DetailsType = 'opportunity' | 'table' | 'list' | 'numeric' | 'criticalrequestchain' | 'n/a';

export interface IssueElement {
  thumbnail: string | null;
  selector: string | null;
  snippet: string | null;
  url: string | null;
  extra: Record<string, unknown> | null;
}

export interface IssueAffectedPage {
  page_title: string;
  page_url: string;
  screenshot?: string | null;
  screenshot_full_page?: string | null;
  details?: { items: unknown[] } | null;
  elements: IssueElement[];
}

export interface IssueOccurrence {
  selector: string;
  snippet: string;
  page_url: string;
  fix_suggestion: string;
  issue_node: IssueNodeData;
}

export interface BoundingRect {
  top: number;
  left: number;
  right: number;
  width: number;
  bottom: number;
  height: number;
}

export interface IssueNodeData {
  lhId?: string;
  path?: string;
  type?: string;
  snippet?: string;
  selector?: string;
  nodeLabel?: string;
  explanation?: string;
  boundingRect?: BoundingRect;
}

export interface IssueNode {
  selector: string | null;
  snippet: string | null;
  thumbnail?: string | null;
  page_url: string;
  issue_node?: IssueNodeData | null;
}

export interface IssueRichDetail {
  id: string;
  rule_id: string;
  title: string;
  priority: string;
  severity: string;
  category: string;
  description: string | null;
  display_value: string | null;
  wcag_version?: string | null;
  wcag_criterion?: string | null;
  conformance_level?: string | null;
  impact?: string | null;
  recommendation?: string | null;
  learn_more_url?: string | null;
  audit_title?: string | null;
  responsibility?: string | null;
  tags?: string[];
  details_type?: string | null;
  wasted_ms?: number | null;
  wasted_bytes?: number | null;
  details?: Record<string, unknown> | null;
  nodes?: IssueNode[];
  occurrences?: IssueOccurrence[];
  affected_pages: IssueAffectedPage[];
}

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

export interface ScanIssueItem {
  id: string;
  rule_id: string;
  title: string;
  priority: IssuePriority;
  severity: IssueSeverity;
  category: IssueCategory;
  description: string | null;
  page_url?: string | null;
  is_restricted?: boolean;
}

export interface ScanIssuesResponse {
  items: ScanIssueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  is_restricted?: boolean;
}

export interface ScanPageItem {
  scan_result_id: string;
  name: string;
  url: string;
  total_issues: number;
  critical_issues: number;
  accessibility_score: number;
  performance_score: number;
  quality_score: number;
  seo_score: number;
}

export interface ScanPagesResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: ScanPageItem[];
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
  score_change: number | null;
  score_change_percent?: number | null;
  total_issues: number;
  total_issues_change_percent: number | null;
  previous_total_issues?: number | null;
  critical_issues: number;
  critical_issues_change_percent: number | null;
  previous_critical_issues?: number | null;
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
  priority: string | null;
  scan_result_id: string | null;
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
  page_url?: string | null;
  is_restricted?: boolean;
}

export interface PerformanceIssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: PerformanceIssueListItem[];
  is_restricted?: boolean;
}

export interface PerformanceIssuesLogItem {
  issue_id: string;
  title: string;
  page_url: string | null;
  priority: string;
  description?: string | null;
}

export interface PerformanceIssuesLogResponse {
  total: number;
  items: PerformanceIssuesLogItem[];
  is_restricted?: boolean;
}

// ---------------------------------------------------------------------------
// Quality / SEO (shared shapes)
// ---------------------------------------------------------------------------

export interface CategoryScoreResponse {
  score: number | null;
  label: string;
  score_change?: number | null;
  total_issues: number;
  previous_total_issues?: number | null;
  critical_issues: number;
  previous_critical_issues?: number | null;
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
  scan_result_id: string | null;
  page_url: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  page_score: number | null;
  priority: string | null;
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
  page_url?: string | null;
  is_restricted?: boolean;
}

export interface CategoryIssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: CategoryIssueListItem[];
  is_restricted?: boolean;
}

export interface CategoryIssuesLogItem {
  issue_id: string;
  title: string;
  page_url: string | null;
  priority: string;
  description?: string | null;
  is_restricted?: boolean;
}

export interface CategoryIssuesLogResponse {
  total: number;
  items: CategoryIssuesLogItem[];
  is_restricted?: boolean;
}

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export interface AccessibilityScoreResponse {
  score: number | null;
  score_change?: number | null;
  score_change_percent?: number | null;
  wcag_level: string;
  level_a_score: number | null;
  level_aa_score: number | null;
  level_aaa_score: number | null;
  total_issues: number;
  previous_total_issues: number | null;
  critical_issues: number;
  previous_critical_issues: number | null;
}

export interface AccessibilityCommonIssueItem {
  rule_id: string;
  title: string;
  elements_affected: number;
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
  conformance_level?: string | null;
  priority: string;
}

export interface AccessibilityIssuesLogResponse {
  total: number;
  items: AccessibilityIssuesLogItem[];
  is_restricted?: boolean;
}

export interface AccessibilityIssueListItem {
  id: string;
  rule_id: string;
  title: string;
  description: string | null;
  learn_more_url: string | null;
  pages_affected: number;
  priority: string;
  responsibility: string | null;
  wcag_version?: string | null;
  wcag_criterion?: string | null;
  wcag_level?: string | null;
  conformance_level?: string | null;
}

export interface AccessibilityIssueListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AccessibilityIssueListItem[];
  is_restricted?: boolean;
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

export interface AccessibilityAffectedPageItem {
  scan_result_id: string | null;
  page_url: string;
  screenshot: string | null;
  total_issues: number;
  critical_issues: number;
  page_score: number | null;
  priority: string | null;
}

export interface PageCategoryIssue {
  issue_id: string;
  rule_id: string;
  title: string;
  priority: string;
  item_count: number;
  display_value: string | null;
  is_restricted?: boolean;
}

export interface PageCategoryIssuesResponse {
  scan_result_id: string;
  page_url: string;
  page_title: string | null;
  performance_score: number | null;
  issues: PageCategoryIssue[];
  is_restricted?: boolean;
}

export interface PerformancePageVitals {
  fcp_ms: number | null;
  lcp_ms: number | null;
  tbt_ms: number | null;
  cls: number | null;
  speed_index_ms: number | null;
}

export interface PerformancePageIssuesResponse {
  scan_result_id: string;
  page_url: string;
  page_title: string | null;
  performance_score: number | null;
  vitals: PerformancePageVitals | null;
  issues: PageCategoryIssue[];
  is_restricted?: boolean;
}

export interface AccessibilityPageIssue {
  issue_id: string;
  rule_id: string;
  title: string;
  wcag_version: string | null;
  wcag_criterion: string | null;
  wcag_level: string | null;
  priority: string;
  responsibility: string | null;
  item_count: number;
  is_restricted?: boolean;
}

export interface AccessibilityPageIssuesResponse {
  scan_result_id: string;
  page_url: string;
  page_title: string | null;
  accessibility_score: number | null;
  issues: AccessibilityPageIssue[];
  is_restricted?: boolean;
}

export interface AccessibilityAffectedPagesResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AccessibilityAffectedPageItem[];
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
  items: ChecklistCriterionItem[];
}

export interface ChecklistPrincipleItem {
  number: number;
  title: string;
  guidelines: ChecklistGuidelineItem[];
}

export interface AccessibilityChecklistResponse {
  wcag_version?: string;
  principles: ChecklistPrincipleItem[];
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

export interface ScanHistoryItem {
  scan_job_id: string;
  status: string;
  strategy: string;
  scanned_at: string;
  created_at?: string;
  completed_at: string | null;
  avg_performance: number | null;
  avg_accessibility: number | null;
  avg_best_practices: number | null;
  avg_seo: number | null;
  pages_scanned?: number | null;
  issues_detected?: number | null;
  scan_url?: string | null;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export type BillingPeriod = 'monthly' | 'annually';
export type BillingPlanName = 'free' | 'pro' | 'enterprise';
export type BillingPlanId = 'free' | 'pro_monthly' | 'pro_annually' | 'enterprise_monthly' | 'enterprise_annually';
export type BillingStatus = 'active' | 'cancelled' | 'pending_payment' | 'payment_failed';
export type InvoiceStatus = 'paid' | 'pending' | 'failed';
export type InvoiceDateRange = '30d' | '90d' | '1y' | 'all';

export interface BillingPlanFeature {
  text: string;
  included: boolean;
}

// Matches backend GET /billing/plans response — a flat list of 5 purchasable
// plan variants (free, pro_monthly, pro_annually, enterprise_monthly,
// enterprise_annually); `name` is the grouping key, `billing_period` is null
// for the free plan (it has no monthly/annually split).
export interface BillingPlan {
  id: BillingPlanId;
  name: BillingPlanName;
  billing_period: BillingPeriod | null;
  credits: number;
  price: number;
  features: BillingPlanFeature[];
}

export interface BillingPlansResponse {
  plans: BillingPlan[];
}

// Matches backend GET /billing/credits response
export interface BillingCredits {
  plan_id: string;
  plan_name: string;
  is_trial: boolean;
  credits_balance: number;
  credits_total: number;
  current_period_end: string | null;
  status: BillingStatus;
}

export interface BillingPaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

// Matches backend GET /billing/summary response
export interface BillingSummary {
  plan_id: string;
  plan_name: string;
  is_trial: boolean;
  price: number;
  billing_period: BillingPeriod;
  expires_in_days: number | null;
  status: BillingStatus;
  payment_method: BillingPaymentMethod | null;
  credits_balance: number;
  credits_total: number;
}

// Matches backend POST /billing/checkout response
export interface CheckoutResponse {
  checkout_url: string;
}

// Matches backend POST /billing/cancel response
export interface CancelSubscriptionResponse {
  ok: boolean;
}

export type StartTrialPlan = 'free' | 'pro' | 'enterprise';

// Response shape isn't fully specified by the backend beyond the 400 error
// case ("Plan already selected") — callers should treat this as opaque.
export type StartTrialResponse = unknown;

export interface InvoiceItem {
  invoice_id: string;
  plan: string;
  billing_period: BillingPeriod;
  amount: number;
  date: string;
  status: InvoiceStatus;
  download_url: string;
}

// Matches backend GET /billing/invoices response
export interface InvoicesResponse {
  items: InvoiceItem[];
  total: number;
}

// Matches backend GET /billing/invoices/{invoice_id}/pdf response
export interface InvoicePdfResponse {
  pdf_url: string;
}
