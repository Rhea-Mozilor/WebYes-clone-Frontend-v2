import client from './client';
import type {
  ScanJob, ScanSummaryResponse, ScanStrategy, PageScore, ScanHistoryItem,
  TriggerScanResponse, PageVitals, ScoreOverTimeResponse,
  DashboardResponse, CancelScanResponse,
  PerformanceScoreResponse, VitalsResponse,
  PerformanceCriticalIssuesResponse, TopAffectedPagesResponse, AffectedPagesResponse,
  PerformanceIssueListResponse,
  ResponseTimesResponse, FilmstripResponse,
  CategoryScoreResponse, CategoryCriticalIssuesResponse,
  CategoryTopAffectedPagesResponse, CategoryAffectedPagesResponse, CategoryIssueListResponse,
  AccessibilityScoreResponse, AccessibilityCommonIssuesResponse, AccessibilityWcagSummaryResponse,
  AccessibilityIssuesLogResponse, AccessibilityPagesListResponse,
  AccessibilityIssuesPerPageResponse,
  AccessibilityManualChecksResponse, RequiredManualChecksResponse,
  ResolveOutcomeResponse, AccessibilityChecklistResponse,
  GuestScanPendingResponse, GuestScanStatusResponse, GuestScanData,
} from '../types';

// Core
export const triggerScan = (website_id: string, strategy: ScanStrategy, max_pages: number = 5) =>
  client.post<TriggerScanResponse>('/scans/', { website_id, strategy, max_pages });

export const getScanJob = (id: string) =>
  client.get<ScanJob>(`/scans/${id}`);

export const getScanSummary = (id: string) =>
  client.get<ScanSummaryResponse>(`/scans/${id}/summary`);

export const getScanDashboard = (id: string) =>
  client.get<DashboardResponse>(`/scans/${id}/dashboard`);

export const cancelScan = (id: string) =>
  client.post<CancelScanResponse>(`/scans/${id}/cancel`);

export const getWebsiteScanHistory = (websiteId: string) =>
  client.get<ScanHistoryItem[]>(`/scans/website/${websiteId}/history`);

export const getPageScores = (scanJobId: string) =>
  client.get<PageScore[]>('/issues/pages', { scan_job_id: scanJobId });

// Legacy vitals — kept for backward compat, use getPerformanceVitals instead
export const getPageVitals = (scanJobId: string) =>
  client.get<PageVitals[]>(`/scans/${scanJobId}/performance/vitals`);

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export const getPerformanceScore = (id: string) =>
  client.get<PerformanceScoreResponse>(`/scans/${id}/performance/score`);

export const getPerformanceVitals = (id: string) =>
  client.get<VitalsResponse>(`/scans/${id}/performance/vitals`);

export const getPerformanceCriticalIssues = (id: string) =>
  client.get<PerformanceCriticalIssuesResponse>(`/scans/${id}/performance/critical-issues`);

export const getPerformanceTopAffectedPages = (id: string) =>
  client.get<TopAffectedPagesResponse>(`/scans/${id}/performance/affected-pages/top`);

export const getPerformanceAffectedPages = (id: string, page = 1, pageSize = 10, search?: string) =>
  client.get<AffectedPagesResponse>(`/scans/${id}/performance/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
  });

export const getPerformanceIssueList = (id: string, page = 1, pageSize = 10) =>
  client.get<PerformanceIssueListResponse>(`/scans/${id}/performance/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
  });

export const getPerformanceScoreOverTime = (scanJobId: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/performance/score-over-time`);

// ---------------------------------------------------------------------------
// Quality (best_practices)
// ---------------------------------------------------------------------------

export const getQualityScore = (id: string) =>
  client.get<CategoryScoreResponse>(`/scans/${id}/quality/score`);

export const getQualityCriticalIssues = (id: string) =>
  client.get<CategoryCriticalIssuesResponse>(`/scans/${id}/quality/critical-issues`);

export const getQualityTopAffectedPages = (id: string) =>
  client.get<CategoryTopAffectedPagesResponse>(`/scans/${id}/quality/affected-pages/top`);

export const getQualityAffectedPages = (id: string, page = 1, pageSize = 10, search?: string) =>
  client.get<CategoryAffectedPagesResponse>(`/scans/${id}/quality/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
  });

export const getQualityIssueList = (id: string, page = 1, pageSize = 10) =>
  client.get<CategoryIssueListResponse>(`/scans/${id}/quality/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
  });

export const getQualityScoreOverTime = (scanJobId: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/quality/score-over-time`);

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const getSeoScore = (id: string) =>
  client.get<CategoryScoreResponse>(`/scans/${id}/seo/score`);

export const getSeoCriticalIssues = (id: string) =>
  client.get<CategoryCriticalIssuesResponse>(`/scans/${id}/seo/critical-issues`);

export const getSeoTopAffectedPages = (id: string) =>
  client.get<CategoryTopAffectedPagesResponse>(`/scans/${id}/seo/affected-pages/top`);

export const getSeoAffectedPages = (id: string, page = 1, pageSize = 10, search?: string) =>
  client.get<CategoryAffectedPagesResponse>(`/scans/${id}/seo/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
  });

export const getSeoIssueList = (id: string, page = 1, pageSize = 10) =>
  client.get<CategoryIssueListResponse>(`/scans/${id}/seo/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
  });

export const getSeoScoreOverTime = (scanJobId: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/seo/score-over-time`);

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export const getAccessibilityScore = (id: string) =>
  client.get<AccessibilityScoreResponse>(`/scans/${id}/accessibility/score`);

export const getAccessibilityCommonIssues = (id: string) =>
  client.get<AccessibilityCommonIssuesResponse>(`/scans/${id}/accessibility/common-issues`);

export const getAccessibilityWcagSummary = (id: string) =>
  client.get<AccessibilityWcagSummaryResponse>(`/scans/${id}/accessibility/wcag-summary`);

export const getAccessibilityScoreOverTime = (id: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${id}/accessibility/score-over-time`);

export const getAccessibilityIssuesLog = (id: string, page = 1, pageSize = 20) =>
  client.get<AccessibilityIssuesLogResponse>(`/scans/${id}/accessibility/issues-log`, {
    page: String(page),
    page_size: String(pageSize),
  });

export const getAccessibilityPagesList = (id: string) =>
  client.get<AccessibilityPagesListResponse>(`/scans/${id}/accessibility/pages-list`);

export const getAccessibilityManualChecks = (id: string) =>
  client.get<AccessibilityManualChecksResponse>(`/scans/${id}/accessibility/manual-checks`);

export const getAccessibilityRequiredManualChecks = (id: string) =>
  client.get<RequiredManualChecksResponse>(`/scans/${id}/accessibility/required-manual-checks`);

export const getAccessibilityChecklist = (id: string) =>
  client.get<AccessibilityChecklistResponse>(`/scans/${id}/accessibility/checklist`);

export const resolveAccessibilityOutcome = (scanJobId: string, outcomeId: string) =>
  client.patch<ResolveOutcomeResponse>(
    `/scans/${scanJobId}/accessibility/outcomes/${outcomeId}/resolve`,
  );

// ---------------------------------------------------------------------------
// Guest scan
// ---------------------------------------------------------------------------

export const triggerGuestScan = (url: string, strategy: ScanStrategy = 'mobile') =>
  client.post<GuestScanPendingResponse | GuestScanData>('/scans/guest', { url, strategy });

export const pollGuestScan = (guestScanId: string) =>
  client.get<GuestScanStatusResponse>(`/scans/guest/${guestScanId}`);

export const guestScanPdfUrl = (guestScanId: string) =>
  `/api/scans/guest/${guestScanId}/pdf`;

// ---------------------------------------------------------------------------
// Performance — response times + filmstrip
// ---------------------------------------------------------------------------

export const getPerformanceResponseTimes = (id: string) =>
  client.get<ResponseTimesResponse>(`/scans/${id}/performance/response-times`);

export const getPerformanceFilmstrip = (id: string) =>
  client.get<FilmstripResponse>(`/scans/${id}/performance/filmstrip`);

// ---------------------------------------------------------------------------
// Accessibility — issues per page
// ---------------------------------------------------------------------------

export const getAccessibilityIssuesPerPage = (id: string) =>
  client.get<AccessibilityIssuesPerPageResponse>(`/scans/${id}/accessibility/issues-per-page`);
