import client from './client';
import type { Issue, IssueCategory, IssueSeverity } from '../types';

interface ListIssuesParams {
  scan_job_id?: string;
  category?: IssueCategory;
  severity?: IssueSeverity;
}

export const listIssues = (params: ListIssuesParams) =>
  client.get<Issue[]>('/issues/', params as Record<string, string | undefined>);

export const getIssue = (id: string) =>
  client.get<Issue>(`/issues/${id}`);
