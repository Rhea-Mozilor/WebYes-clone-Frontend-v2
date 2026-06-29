import client from './client';
import type { ScanJob, ScanSummaryResponse, ScanStrategy, PageScore, ScanHistoryItem, TriggerScanResponse, PageVitals, ScoreOverTimeResponse } from '../types';

export const triggerScan = (website_id: string, strategy: ScanStrategy) =>
  client.post<TriggerScanResponse>('/scans/', { website_id, strategy });

export const getScanJob = (id: string) =>
  client.get<ScanJob>(`/scans/${id}`);

export const getScanSummary = (id: string) =>
  client.get<ScanSummaryResponse>(`/scans/${id}/summary`);

export const getWebsiteScanHistory = (websiteId: string) =>
  client.get<ScanHistoryItem[]>(`/scans/website/${websiteId}/history`);

export const getPageScores = (scanJobId: string) =>
  client.get<PageScore[]>('/issues/pages', { scan_job_id: scanJobId });

export const getPageVitals = (scanJobId: string) =>
  client.get<PageVitals[]>(`/scans/${scanJobId}/vitals`);

export const getQualityScoreOverTime = (scanJobId: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/quality/score-over-time`);

export const getSeoScoreOverTime = (scanJobId: string) =>
  client.get<ScoreOverTimeResponse>(`/scans/${scanJobId}/seo/score-over-time`);
