import client from './client';
import type {
  ScanJob, ScanSummaryResponse, ScanStrategy, PageScore,
  TriggerScanResponse, PageVitals, ScoreOverTimeResponse,
  DashboardResponse, CancelScanResponse, ScanIssuesResponse, ScanPagesResponse,
  PerformanceScoreResponse, VitalsResponse,
  PerformanceCriticalIssuesResponse, TopAffectedPagesResponse, AffectedPagesResponse,
  PerformanceIssueListResponse, PerformanceIssuesLogResponse,
  ResponseTimesResponse, FilmstripResponse,
  CategoryScoreResponse, CategoryCriticalIssuesResponse,
  CategoryTopAffectedPagesResponse, CategoryAffectedPagesResponse, CategoryIssueListResponse,
  CategoryIssuesLogResponse,
  AccessibilityScoreResponse, AccessibilityCommonIssuesResponse, AccessibilityWcagSummaryResponse,
  AccessibilityIssuesLogResponse, AccessibilityPagesListResponse,
  AccessibilityAffectedPagesResponse, AccessibilityIssueListResponse,
  AccessibilityIssuesPerPageResponse,
  AccessibilityManualChecksResponse, RequiredManualChecksResponse,
  ResolveOutcomeResponse, AccessibilityChecklistResponse,
  GuestScanPendingResponse, GuestScanStatusResponse, GuestScanData,
} from '../types';

const strat = (strategy?: ScanStrategy) => strategy ? { strategy } : {};

// Core
export const triggerScan = (website_id: string) =>
  client.post<TriggerScanResponse>('/scans/', { website_id });

export const getScanReportUrl = (scanJobId: string) =>
  `/api/scans/${scanJobId}/report`;

export const getScanJob = (id: string) =>
  client.get<ScanJob>(`/scans/${id}`);

export const getScanSummary = (id: string, strategy?: ScanStrategy) =>
  client.get<ScanSummaryResponse>(`/scans/${id}/summary`, strat(strategy));

export const getScanDashboard = (id: string, strategy?: ScanStrategy) =>
  client.get<DashboardResponse>(`/scans/${id}/dashboard`, strat(strategy));

export const cancelScan = (id: string) =>
  client.post<CancelScanResponse>(`/scans/${id}/cancel`);

export const getScanIssues = (id: string, page = 1, pageSize = 5, category?: string, strategy?: ScanStrategy, severity?: string) =>
  client.get<ScanIssuesResponse>(`/scans/${id}/issues`, {
    page: String(page),
    page_size: String(pageSize),
    ...(category ? { category } : {}),
    ...(severity ? { severity } : {}),
    ...strat(strategy),
  });

export const getScanPages = (id: string, strategy?: ScanStrategy) =>
  client.get<ScanPagesResponse>(`/scans/${id}/pages`, strat(strategy));


export const getPageScores = (scanJobId: string) =>
  client.get<PageScore[]>('/issues/pages', { scan_job_id: scanJobId });

export const getPageVitals = (scanJobId: string) =>
  client.get<PageVitals[]>(`/scans/${scanJobId}/performance/vitals`);

// ---------------------------------------------------------------------------
// Performance
// ---------------------------------------------------------------------------

export const getPerformanceScore = (id: string, strategy?: ScanStrategy) =>
  client.get<PerformanceScoreResponse>(`/scans/${id}/performance/score`, strat(strategy));

export const getPerformanceVitals = (id: string, strategy?: ScanStrategy) =>
  client.get<VitalsResponse>(`/scans/${id}/performance/vitals`, strat(strategy));

export const getPerformanceCriticalIssues = (id: string, strategy?: ScanStrategy) =>
  client.get<PerformanceCriticalIssuesResponse>(`/scans/${id}/performance/critical-issues`, strat(strategy));

export const getPerformanceTopAffectedPages = (id: string, strategy?: ScanStrategy) =>
  client.get<TopAffectedPagesResponse>(`/scans/${id}/performance/affected-pages/top`, strat(strategy));

export const getPerformanceAffectedPages = (id: string, page = 1, pageSize = 10, search?: string, strategy?: ScanStrategy) =>
  client.get<AffectedPagesResponse>(`/scans/${id}/performance/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
    ...strat(strategy),
  });

export const getPerformanceIssueList = (id: string, page = 1, pageSize = 10, strategy?: ScanStrategy) =>
  client.get<PerformanceIssueListResponse>(`/scans/${id}/performance/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
    ...strat(strategy),
  });

export const getPerformanceScoreOverTime = (scanJobId: string, strategy?: ScanStrategy) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/performance/score-over-time`, strat(strategy));

export const getPerformanceIssuesLog = (id: string, pageSize = 5, strategy?: ScanStrategy) =>
  client.get<PerformanceIssuesLogResponse>(`/scans/${id}/performance/issues-log`, {
    page_size: String(pageSize),
    ...strat(strategy),
  });

// ---------------------------------------------------------------------------
// Quality (best_practices)
// ---------------------------------------------------------------------------

export const getQualityScore = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryScoreResponse>(`/scans/${id}/quality/score`, strat(strategy));

export const getQualityCriticalIssues = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryCriticalIssuesResponse>(`/scans/${id}/quality/critical-issues`, strat(strategy));

export const getQualityTopAffectedPages = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryTopAffectedPagesResponse>(`/scans/${id}/quality/affected-pages/top`, strat(strategy));

export const getQualityAffectedPages = (id: string, page = 1, pageSize = 10, search?: string, strategy?: ScanStrategy) =>
  client.get<CategoryAffectedPagesResponse>(`/scans/${id}/quality/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
    ...strat(strategy),
  });

export const getQualityIssueList = (id: string, page = 1, pageSize = 10, strategy?: ScanStrategy) =>
  client.get<CategoryIssueListResponse>(`/scans/${id}/quality/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
    ...strat(strategy),
  });

export const getQualityScoreOverTime = (scanJobId: string, strategy?: ScanStrategy) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/quality/score-over-time`, strat(strategy));

export const getQualityIssuesLog = (id: string, pageSize = 5, strategy?: ScanStrategy) =>
  client.get<CategoryIssuesLogResponse>(`/scans/${id}/quality/issues-log`, {
    page_size: String(pageSize),
    ...strat(strategy),
  });

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

export const getSeoScore = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryScoreResponse>(`/scans/${id}/seo/score`, strat(strategy));

export const getSeoCriticalIssues = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryCriticalIssuesResponse>(`/scans/${id}/seo/critical-issues`, strat(strategy));

export const getSeoTopAffectedPages = (id: string, strategy?: ScanStrategy) =>
  client.get<CategoryTopAffectedPagesResponse>(`/scans/${id}/seo/affected-pages/top`, strat(strategy));

export const getSeoAffectedPages = (id: string, page = 1, pageSize = 10, search?: string, strategy?: ScanStrategy) =>
  client.get<CategoryAffectedPagesResponse>(`/scans/${id}/seo/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
    ...strat(strategy),
  });

export const getSeoIssueList = (id: string, page = 1, pageSize = 10, strategy?: ScanStrategy) =>
  client.get<CategoryIssueListResponse>(`/scans/${id}/seo/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
    ...strat(strategy),
  });

export const getSeoScoreOverTime = (scanJobId: string, strategy?: ScanStrategy) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/seo/score-over-time`, strat(strategy));

export const getSeoIssuesLog = (id: string, pageSize = 5, strategy?: ScanStrategy) =>
  client.get<CategoryIssuesLogResponse>(`/scans/${id}/seo/issues-log`, {
    page_size: String(pageSize),
    ...strat(strategy),
  });

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

export const getAccessibilityScore = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityScoreResponse>(`/scans/${id}/accessibility/score`, strat(strategy));

export const getAccessibilityCommonIssues = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityCommonIssuesResponse>(`/scans/${id}/accessibility/common-issues`, strat(strategy));

export const getAccessibilityWcagSummary = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityWcagSummaryResponse>(`/scans/${id}/accessibility/wcag-summary`, strat(strategy));

export const getAccessibilityScoreOverTime = (id: string, strategy?: ScanStrategy) =>
  client.get<ScoreOverTimeResponse>(`/scans/${id}/accessibility/score-over-time`, strat(strategy));

export const getAccessibilityIssuesLog = (id: string, page = 1, pageSize = 20, strategy?: ScanStrategy) =>
  client.get<AccessibilityIssuesLogResponse>(`/scans/${id}/accessibility/issues-log`, {
    page: String(page),
    page_size: String(pageSize),
    ...strat(strategy),
  });

export const getAccessibilityIssueList = (id: string, page = 1, pageSize = 20, strategy?: ScanStrategy) =>
  client.get<AccessibilityIssueListResponse>(`/scans/${id}/accessibility/issue-list`, {
    page: String(page),
    page_size: String(pageSize),
    ...strat(strategy),
  });

export const getAccessibilityPagesList = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityPagesListResponse>(`/scans/${id}/accessibility/pages-list`, strat(strategy));

export const getAccessibilityAffectedPages = (id: string, page = 1, pageSize = 20, search?: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityAffectedPagesResponse>(`/scans/${id}/accessibility/affected-pages`, {
    page: String(page),
    page_size: String(pageSize),
    ...(search ? { search } : {}),
    ...strat(strategy),
  });

export const getAccessibilityManualChecks = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityManualChecksResponse>(`/scans/${id}/accessibility/manual-checks`, strat(strategy));

export const getAccessibilityRequiredManualChecks = (id: string, strategy?: ScanStrategy) =>
  client.get<RequiredManualChecksResponse>(`/scans/${id}/accessibility/required-manual-checks`, strat(strategy));

export const getAccessibilityChecklist = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityChecklistResponse>(`/scans/${id}/accessibility/checklist`, strat(strategy));

export const resolveAccessibilityOutcome = (scanJobId: string, outcomeId: string) =>
  client.patch<ResolveOutcomeResponse>(
    `/scans/${scanJobId}/accessibility/outcomes/${outcomeId}/resolve`,
  );

// ---------------------------------------------------------------------------
// Guest scan
// ---------------------------------------------------------------------------

export const triggerGuestScan = (url: string, strategy: ScanStrategy = 'desktop') =>
  client.post<GuestScanPendingResponse | GuestScanData>('/scans/guest', { url, strategy });

export const pollGuestScan = (guestScanId: string) =>
  client.get<GuestScanStatusResponse>(`/scans/guest/${guestScanId}`);

export const guestScanPdfUrl = (guestScanId: string) =>
  `/api/scans/guest/${guestScanId}/pdf`;

// ---------------------------------------------------------------------------
// Performance — response times + filmstrip
// ---------------------------------------------------------------------------

export const getPerformanceResponseTimes = (id: string, strategy?: ScanStrategy) =>
  client.get<ResponseTimesResponse>(`/scans/${id}/performance/response-times`, strat(strategy));

export const getPerformanceFilmstrip = (id: string, strategy?: ScanStrategy) =>
  client.get<FilmstripResponse>(`/scans/${id}/performance/filmstrip`, strat(strategy));

// ---------------------------------------------------------------------------
// Accessibility — issues per page
// ---------------------------------------------------------------------------

export const getAccessibilityIssuesPerPage = (id: string, strategy?: ScanStrategy) =>
  client.get<AccessibilityIssuesPerPageResponse>(`/scans/${id}/accessibility/issues-per-page`, strat(strategy));

export const getPerformancePageIssues = (
  scanJobId: string,
  scanResultId: string,
) => client.get<import('../types').PerformancePageIssuesResponse>(
  `/scans/${scanJobId}/performance/pages/${scanResultId}`,
);

export const getAccessibilityPageIssues = (
  scanJobId: string,
  scanResultId: string,
) => client.get<import('../types').AccessibilityPageIssuesResponse>(
  `/scans/${scanJobId}/accessibility/pages/${scanResultId}`,
);

export const getScanHistory = (websiteId: string) =>
  client.get<import('../types').ScanHistoryItem[]>(`/scans/website/${websiteId}/history`);

export const getActiveScan = (websiteId: string) =>
  client.get<{ scan_job_id: string; status: string; created_at: string } | null>(
    `/scans/website/${websiteId}/active`,
  );

export const getPageCategoryIssues = (
  scanJobId: string,
  category: 'accessibility' | 'performance' | 'quality' | 'seo',
  scanResultId: string,
) => client.get<import('../types').PageCategoryIssuesResponse>(
  `/scans/${scanJobId}/${category}/pages/${scanResultId}`,
);
