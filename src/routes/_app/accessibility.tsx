import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  AlertTriangle, Info, Loader2, CheckCircle2, ClipboardList, Ban,
  AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Check, X, Search, SlidersHorizontal, Download,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import {
  getWebsiteScanHistory,
  getAccessibilityScore,
  getAccessibilityCommonIssues,
  getAccessibilityWcagSummary,
  getAccessibilityScoreOverTime,
  getAccessibilityIssuesLog,
  getAccessibilityPagesList,
  getAccessibilityIssuesPerPage,
  getAccessibilityRequiredManualChecks,
  getAccessibilityChecklist,
  resolveAccessibilityOutcome,
} from '../../api/scans'

export const Route = createFileRoute('/_app/accessibility')({
  component: AccessibilityPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Automated check', 'Required manual check', 'Check list']

function priorityBadgeClass(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'medium') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-500'
}

function scoreColor(s: number) {
  if (s >= 90) return '#22c55e'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}

function pageName(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '')
    const parts = path.split('/').filter(Boolean)
    if (!parts.length) return 'Home'
    return decodeURIComponent(parts[parts.length - 1])
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {
    return url
  }
}

function AccessibilityPage() {
  const { websiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [issuesLogPage, setIssuesLogPage] = useState(1)
  const [pagesSearch, setPagesSearch] = useState('')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId!),
    enabled: !!websiteId,
  })

  const completedScans = history.filter((h) => h.status === 'completed')
  const latestScan = completedScans[0]

  const { data: scoreData } = useQuery({
    queryKey: ['accessibility-score', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityScore(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: commonIssues } = useQuery({
    queryKey: ['accessibility-common', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityCommonIssues(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: wcagSummary } = useQuery({
    queryKey: ['accessibility-wcag', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityWcagSummary(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['accessibility-over-time', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityScoreOverTime(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: pagesList } = useQuery({
    queryKey: ['accessibility-pages', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityPagesList(latestScan!.scan_job_id),
    enabled: !!latestScan && activeTab === 'Affected pages',
  })

  const { data: issuesLog } = useQuery({
    queryKey: ['accessibility-issues-log', latestScan?.scan_job_id, issuesLogPage],
    queryFn: () => getAccessibilityIssuesLog(latestScan!.scan_job_id, issuesLogPage, 20),
    enabled: !!latestScan && activeTab === 'Automated check',
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['accessibility-dash-issues', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityIssuesLog(latestScan!.scan_job_id, 1, 5),
    enabled: !!latestScan,
  })

  const { data: issuesPerPage } = useQuery({
    queryKey: ['accessibility-issues-per-page', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityIssuesPerPage(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: requiredManualChecks } = useQuery({
    queryKey: ['accessibility-manual', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityRequiredManualChecks(latestScan!.scan_job_id),
    enabled: !!latestScan && activeTab === 'Required manual check',
  })

  const { data: checklist } = useQuery({
    queryKey: ['accessibility-checklist', latestScan?.scan_job_id],
    queryFn: () => getAccessibilityChecklist(latestScan!.scan_job_id),
    enabled: !!latestScan && activeTab === 'Check list',
  })

  const score = scoreData?.score ?? 0
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0
  const prevTotalIssues = scoreData?.previous_total_issues
  const prevCriticalIssues = scoreData?.previous_critical_issues

  const levelA = scoreData?.level_a_score ?? 0
  const levelAA = scoreData?.level_aa_score ?? 0
  const levelAAA = scoreData?.level_aaa_score ?? null
  const levelAAAEnabled = localStorage.getItem('levelAAAEnabled') !== 'false'

  const trendPct = scoreData?.score_change_percent ?? null

  const chartData = (scoreOverTime?.data_points ?? []).map((pt, i) => ({
    label: `Scan ${i + 1}`,
    score: pt.score ?? 0,
  }))

  const commonItems = commonIssues?.items ?? []
  const totalCommon = commonIssues?.total_issues ?? totalIssues

  const pieData = [
    { value: totalCommon, fill: '#1e3a8a' },
    { value: Math.max(0, 300 - totalCommon), fill: '#e0e7ff' },
  ]

  if (!websiteId) return <EmptyState msg="Select a website from the top bar to get started." />
  if (isLoading) return <Spinner />
  if (!latestScan) return <EmptyState msg="No completed scans yet. Run a scan to see accessibility data." />

  return (
    <div className="flex flex-col min-h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      {activeTab === 'Dashboard' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-3">
                    An accessible website reflects<br className="hidden sm:block" />
                    positively on your brand image.
                  </h2>
                  <p className="text-xs text-gray-500 mb-2">
                    Comply with WCAG {wcagSummary?.wcag_version ?? '2.1'}.{' '}
                    <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline">Learn more</a>
                  </p>
                  <p className="text-xs text-gray-400 mb-5">
                    WCAG Level: <span className="font-semibold text-amber-500">{scoreData?.wcag_level ?? 'AA'}</span>
                  </p>
                  <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                    className="inline-flex items-center px-5 py-2 border-2 border-blue-600 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                    View all issues
                  </Link>
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{ value: score }, { value: 100 - score }]}
                          cx="50%" cy="50%" startAngle={90} endAngle={-270}
                          innerRadius={55} outerRadius={75} dataKey="value" strokeWidth={0}>
                          <Cell fill="#3b82f6" />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900">{score}%</span>
                      <span className="text-[10px] text-gray-400 text-center leading-tight mt-0.5">Overall score<br />(automated check)</span>
                    </div>
                  </div>
                  {trendPct != null && trendPct !== 0 && (
                    <div className={cn('text-xs font-medium mt-1', trendPct > 0 ? 'text-green-600' : 'text-red-500')}>
                      {trendPct > 0 ? '▲' : '▼'} {Math.abs(trendPct).toFixed(1)}%
                    </div>
                  )}
                  <span className="text-xs font-semibold text-amber-500 mt-1">Level {scoreData?.wcag_level ?? 'AA'}</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 border border-gray-100 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1">Level A</div>
                    <div className="text-xl font-bold text-gray-900">{levelA}%</div>
                  </div>
                  <div className="text-center p-3 border border-gray-100 rounded-xl">
                    <div className="text-xs text-gray-500 mb-1">Level AA</div>
                    <div className="text-xl font-bold text-gray-900">{levelAA}%</div>
                  </div>
                  {levelAAAEnabled ? (
                    <div className="text-center p-3 border border-gray-100 rounded-xl">
                      <div className="text-xs text-gray-500 mb-1">Level AAA</div>
                      <div className="text-xl font-bold text-gray-900">
                        {levelAAA !== null ? `${levelAAA}%` : '—'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="text-xs text-gray-400 leading-tight">
                        Level AAA via <Link to="/settings" search={{ tab: 'accessibility' }} className="text-blue-600 hover:underline">settings</Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                      Total issues <Info className="w-3 h-3 text-gray-300" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{String(totalIssues).padStart(2, '0')}</div>
                    {prevTotalIssues != null && (
                      <div className="text-xs text-gray-400 mt-0.5">Previous: {prevTotalIssues}</div>
                    )}
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="h-px bg-gray-50" />
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                    Critical issues <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-2xl font-bold text-red-500">{String(criticalCount).padStart(2, '0')}</div>
                  {prevCriticalIssues != null && (
                    <div className="text-xs text-gray-400 mt-0.5">Previous: {prevCriticalIssues}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Common accessibility issues</h3>
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={56}
                          dataKey="value" strokeWidth={0}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-400">Total</span>
                      <span className="text-lg font-bold text-gray-900">{totalCommon}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {commonItems.length === 0 ? (
                    <p className="text-xs text-gray-400 py-6 text-center">No common issues found</p>
                  ) : (
                    <div className="space-y-2">
                      {commonItems.slice(0, 7).map((item, i) => (
                        <div key={item.rule_id} className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-sm mt-1 shrink-0"
                            style={{ backgroundColor: i % 2 === 0 ? '#1e3a8a' : '#93c5fd' }} />
                          <span className="flex-1 text-xs text-gray-700 leading-snug">{item.title}</span>
                          <span className="w-16 text-xs font-semibold text-gray-800 text-right shrink-0">{item.pages_affected}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Score over time */}
              {chartData.length >= 2 && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-gray-700 mb-3">Score over time</h4>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                        formatter={(v) => [`${Number(v)}%`, 'Accessibility']} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">WCAG {wcagSummary?.wcag_version ?? '2.1'}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      Passed Audits <Info className="w-3 h-3 text-gray-300" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{wcagSummary?.passed_audits ?? 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <ClipboardList className="w-8 h-8 text-blue-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      Needs review <Info className="w-3 h-3 text-gray-300" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{wcagSummary?.needs_review_count ?? 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <Ban className="w-8 h-8 text-gray-300 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      Not Applicable <Info className="w-3 h-3 text-gray-300" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{wcagSummary?.not_applicable_count ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issues log */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Issues log {dashIssues ? `(${dashIssues.total})` : ''}</h3>
              <button onClick={() => setActiveTab('Automated check')}
                className="text-xs text-blue-600 hover:underline font-medium">View all →</button>
            </div>
            {!dashIssues || dashIssues.items.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No issues found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Issue</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4 w-24">WCAG Level</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4 w-24">Priority</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 w-40">Page</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dashIssues.items.map((item) => (
                      <tr key={item.issue_id} className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/issues/${item.issue_id}`}>
                        <td className="py-2.5 pr-4">
                          <div className="text-xs text-blue-700 font-medium hover:underline">{item.title}</div>
                        </td>
                        <td className="py-2.5 pr-4">
                          {item.wcag_level && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {item.wcag_level}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadgeClass(item.priority))}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="text-xs text-gray-500 truncate block max-w-xs">{item.page_url}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Issues per page */}
          {issuesPerPage && issuesPerPage.items.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Issues per page</h3>
              <div className="space-y-3">
                {issuesPerPage.items.slice(0, 8).map((item, i) => {
                  const max = Math.max(...issuesPerPage.items.map((x) => x.issue_count), 1)
                  const pct = Math.round((item.issue_count / max) * 100)
                  const shortUrl = item.page_url.replace(/^https?:\/\//, '').replace(/\/$/, '') || item.page_url
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-40 truncate shrink-0">{shortUrl}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-700 w-6 text-right shrink-0">{item.issue_count}</span>
                      {item.critical_count > 0 && (
                        <span className="text-xs text-red-500 shrink-0">({item.critical_count} critical)</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Affected pages */}
      {activeTab === 'Affected pages' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4">
          {/* Top: most-affected page cards */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-900 mb-1">Accessibility issues per page</h3>
            <p className="text-xs text-gray-400 mb-4">Pages with most issues</p>
            {!pagesList ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : pagesList.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No page data</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {pagesList.items.slice().sort((a, b) => b.total_issues - a.total_issues).slice(0, 8).map((item, i) => {
                  const barColor = item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#22c55e'
                  const name = pageName(item.page_url)
                  return (
                    <div key={i} className="shrink-0 w-44 rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="h-28 bg-gray-100 flex items-center justify-center px-2 text-center">
                        <span className="text-xs text-gray-400 leading-snug">{name}</span>
                      </div>
                      <div className="p-3 flex-1">
                        <div className="flex items-start justify-between gap-1 mb-3">
                          <span className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{name}</span>
                          <a href={item.page_url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-600 shrink-0 mt-0.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></svg>
                          </a>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <div className="text-sm font-bold text-gray-900">{item.total_issues}</div>
                            <div className="text-[10px] text-gray-400">Total issues</div>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{item.critical_issues}</div>
                            <div className="text-[10px] text-gray-400">Critical issues</div>
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5" style={{ backgroundColor: barColor }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom: pages list table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">Pages list</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by pages"
                    value={pagesSearch}
                    onChange={(e) => setPagesSearch(e.target.value)}
                    className="text-xs text-gray-700 placeholder-gray-400 outline-none w-36"
                  />
                </div>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {!pagesList ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : pagesList.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No affected pages found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Pages</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4 w-20">Score</th>
                      <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4 w-28">
                        <span className="flex items-center gap-1">Priority <ChevronDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-right text-xs font-semibold text-gray-500 pb-3 pr-4 w-32">Critical issues</th>
                      <th className="text-right text-xs font-semibold text-gray-500 pb-3 w-24">Total issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagesList.items
                      .filter((item) => !pagesSearch || item.page_url.toLowerCase().includes(pagesSearch.toLowerCase()))
                      .map((item, i) => {
                        const s = item.score ?? 0
                        const shortUrl = item.page_url.replace(/^https?:\/\//, '')
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4">
                              <div className="text-xs font-medium text-gray-800">{pageName(item.page_url)}</div>
                              <div className="text-xs text-gray-400 mt-0.5">URL : <a href={item.page_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">{shortUrl}</a></div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-xs font-bold" style={{ color: scoreColor(s) }}>{s}%</span>
                            </td>
                            <td className="py-3 pr-4">
                              {item.priority && (
                                <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadgeClass(item.priority))}>
                                  {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <span className="text-xs font-semibold text-red-500">{item.critical_issues}</span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="text-xs text-gray-700">{item.total_issues}</span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Automated check */}
      {activeTab === 'Automated check' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Automated checks {issuesLog ? `(${issuesLog.total})` : ''}
            </h3>
            {!issuesLog ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : issuesLog.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No automated checks found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Issue</th>
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4 w-24">WCAG Level</th>
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4 w-24">Priority</th>
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 w-48">Page</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {issuesLog.items.map((item) => (
                        <tr key={item.issue_id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-gray-800 font-medium">{item.title}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {item.wcag_level && (
                              <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                {item.wcag_level}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadgeClass(item.priority))}>
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-gray-500 truncate block max-w-xs">{item.page_url}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <IssuesLogPagination
                  page={issuesLogPage}
                  total={issuesLog.total}
                  pageSize={20}
                  onPage={setIssuesLogPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Required manual check */}
      {activeTab === 'Required manual check' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Required manual checks {requiredManualChecks ? `(${requiredManualChecks.items.length})` : ''}
            </h3>
            {!requiredManualChecks ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : requiredManualChecks.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No manual checks required</p>
            ) : (
              <div className="space-y-3">
                {requiredManualChecks.items.map((item) => (
                  <ManualCheckAccordion key={item.audit_id} item={item} scanJobId={latestScan.scan_job_id} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check list */}
      {activeTab === 'Check list' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">WCAG {checklist?.wcag_version ?? '2.1'} Checklist</h3>
            </div>
            {!checklist ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : checklist.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No checklist available</p>
            ) : (
              <div className="space-y-6">
                {checklist.items.map((principle) => (
                  <div key={principle.principle}>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">
                      {principle.principle}. {principle.title}
                    </h4>
                    <div className="space-y-4">
                      {principle.guidelines.map((guideline) => (
                        <div key={guideline.guideline} className="pl-3 border-l-2 border-gray-100">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">
                            {guideline.guideline} {guideline.title}
                          </h5>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  <th className="text-left font-semibold text-gray-500 pb-2 pr-3 w-20">Criterion</th>
                                  <th className="text-left font-semibold text-gray-500 pb-2 pr-3">Description</th>
                                  <th className="text-left font-semibold text-gray-500 pb-2 pr-3 w-16">Level</th>
                                  <th className="text-right font-semibold text-gray-500 pb-2 pr-3 w-20">Affected</th>
                                  <th className="text-left font-semibold text-gray-500 pb-2 w-20">Outcome</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {guideline.criteria.map((crit) => (
                                  <tr key={crit.criterion} className="hover:bg-gray-50">
                                    <td className="py-2 pr-3 text-gray-600 font-medium">{crit.criterion}</td>
                                    <td className="py-2 pr-3 text-gray-700">{crit.description}</td>
                                    <td className="py-2 pr-3">
                                      <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-medium">
                                        {crit.level}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3 text-right text-gray-600">{crit.pages_affected}</td>
                                    <td className="py-2">
                                      <OutcomeChip outcome={crit.outcome} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OutcomeChip({ outcome }: { outcome: string }) {
  const lower = outcome.toLowerCase()
  if (lower === 'pass' || lower === 'passed') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
      <Check className="w-3 h-3" /> Pass
    </span>
  )
  if (lower === 'fail' || lower === 'failed') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
      <X className="w-3 h-3" /> Fail
    </span>
  )
  if (lower === 'n/a' || lower === 'not applicable') return (
    <span className="text-xs text-gray-400">N/A</span>
  )
  return <span className="text-xs text-gray-500">{outcome}</span>
}

function ManualCheckAccordion({
  item,
  scanJobId,
}: {
  item: {
    audit_id: string
    title: string
    issue_count: number
    wcag_level: string | null
    description: string | null
    how_to_test: string | null
    is_resolved: boolean
    pages: Array<{
      outcome_id: string
      screenshot: string | null
      page_url: string
      is_resolved: boolean
    }>
  }
  scanJobId: string
}) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const resolveMutation = useMutation({
    mutationFn: (outcomeId: string) => resolveAccessibilityOutcome(scanJobId, outcomeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-manual', scanJobId] })
    },
  })

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {item.is_resolved
            ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          }
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-800">{item.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {item.wcag_level && (
                <span className="text-xs text-blue-600 font-medium">{item.wcag_level}</span>
              )}
              <span className="text-xs text-gray-400">{item.issue_count} {item.issue_count === 1 ? 'issue' : 'issues'}</span>
              {item.is_resolved && (
                <span className="text-xs text-green-600 font-medium">Resolved</span>
              )}
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          {item.description && (
            <p className="text-xs text-gray-600 mt-3 mb-2">{item.description}</p>
          )}
          {item.how_to_test && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-xs font-semibold text-blue-700">How to test: </span>
              <span className="text-xs text-blue-700">{item.how_to_test}</span>
            </div>
          )}
          {item.pages.length > 0 && (
            <div className="space-y-2 mt-3">
              {item.pages.map((page) => (
                <div key={page.outcome_id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <span className="text-xs text-gray-700 truncate">{page.page_url}</span>
                  <button
                    onClick={() => resolveMutation.mutate(page.outcome_id)}
                    disabled={page.is_resolved || resolveMutation.isPending}
                    className={cn(
                      'shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                      page.is_resolved
                        ? 'bg-green-50 text-green-700 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    )}
                  >
                    {page.is_resolved ? <><Check className="w-3 h-3" /> Resolved</> : 'Mark resolved'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IssuesLogPagination({ page, total, pageSize, onPage }: {
  page: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
      <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-full py-32">
      <p className="text-sm text-gray-400">{msg}</p>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full py-32">
      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
    </div>
  )
}
