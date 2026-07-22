import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import {
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Download,
} from 'lucide-react'
import UrlSvg from '../../components/svgicons/url.svg'
import AvgResponseTimeSvg from '../../components/svgicons/avgresponsetime.svg'
import { cn } from '../../lib/utils'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import { useSiteStore } from '../../store/siteStore'
import { IssueDetailPanel } from '../../components/IssueDetailPanel'
import { PerformancePageDetail } from '../../components/PerformancePageDetail'
import { useIsBasicPlan, LockedOverlay, LimitedListUpgradeFooter } from '../../components/UpgradeLock'
import {
  getPerformanceScore,
  getPerformanceVitals,
  getPerformanceCriticalIssues,
  getPerformanceScoreOverTime,
  getPerformanceAffectedPages,
  getPerformanceIssueList,
  getPerformanceResponseTimes,
  getPerformanceFilmstrip,
  getPerformanceIssuesLog,
} from '../../api/scans'

export const Route = createFileRoute('/_app/performance')({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === 'string' ? s.tab : 'Dashboard') as string,
    issueId: typeof s.issueId === 'string' ? s.issueId : undefined,
  }),
  component: PerformancePage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issues list']
const TIME_FILTERS = ['Today', 'Yesterday', 'Last week'] as const

const VITALS_META = [
  { key: 'fcp_ms' as const, abbr: 'FCP', label: 'First Contentful Paint', unit: 's', good: 1800, needs: 3000 },
  { key: 'lcp_ms' as const, abbr: 'LCP', label: 'Largest Contentful Paint', unit: 's', good: 2500, needs: 4000 },
  { key: 'tbt_ms' as const, abbr: 'TBT', label: 'Total Blocking Time', unit: 's', good: 200, needs: 600 },
  { key: 'cls' as const, abbr: 'CLS', label: 'Cumulative Layout Shift', unit: '', good: 0.1, needs: 0.25 },
  { key: 'speed_index_ms' as const, abbr: 'SI', label: 'Speed Index', unit: 'ms', good: 3400, needs: 5800 },
]

type VitalKey = 'fcp_ms' | 'lcp_ms' | 'tbt_ms' | 'cls' | 'speed_index_ms'


function formatVital(key: VitalKey, value: number | null, unit: string) {
  if (value == null) return '—'
  if (key === 'cls') return value.toFixed(2)
  if (unit === 's') return `${(value / 1000).toFixed(1)} s`
  if (unit === 'ms') return value > 0 ? `${Math.round(value)} ms` : '0ms'
  return `${value}`
}

function avg(vals: (number | null | undefined)[]): number | null {
  const nums = vals.filter((v): v is number => v != null)
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
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


function PerformancePage() {
  const isBasicPlan = useIsBasicPlan()
  const { websiteId, strategy, scansByWebsite } = useSiteStore()
  const scanId = websiteId ? scansByWebsite[websiteId]?.scanId ?? null : null
  const { tab: activeTab, issueId: preselectedIssueId } = Route.useSearch()
  const navigate = useNavigate({ from: '/performance' })
  const setActiveTab = (tab: string) => navigate({ search: (s) => ({ ...s, tab }), replace: true })
  const [timeFilter, setTimeFilter] = useState<typeof TIME_FILTERS[number]>('Last week')
  const [affectedPage, setAffectedPage] = useState(1)
  const [issueListPage, setIssueListPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [issueSearch, setIssueSearch] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [pageDetailView, setPageDetailView] = useState<{ scanResultId: string; pageUrl: string } | null>(null)

  useEffect(() => {
    if (preselectedIssueId) setSelectedIssueId(preselectedIssueId)
  }, [preselectedIssueId])

  const { data: scoreData } = useQuery({
    queryKey: ['perf-score', scanId, strategy],
    queryFn: () => getPerformanceScore(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: vitalsData } = useQuery({
    queryKey: ['perf-vitals', scanId, strategy],
    queryFn: () => getPerformanceVitals(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: criticalData } = useQuery({
    queryKey: ['perf-critical', scanId, strategy],
    queryFn: () => getPerformanceCriticalIssues(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['perf-over-time', scanId, strategy],
    queryFn: () => getPerformanceScoreOverTime(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: affectedPages } = useQuery({
    queryKey: ['perf-affected', scanId, affectedPage, search, strategy],
    queryFn: () => getPerformanceAffectedPages(scanId!, affectedPage, 10, search, strategy),
    enabled: !!scanId && activeTab === 'Affected pages',
  })

  const { data: issueList } = useQuery({
    queryKey: ['perf-issue-list', scanId, issueListPage, strategy],
    queryFn: () => getPerformanceIssueList(scanId!, issueListPage, 10, strategy),
    enabled: !!scanId && activeTab === 'Issues list',
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['perf-dash-issues-log', scanId, strategy],
    queryFn: () => getPerformanceIssuesLog(scanId!, 5, strategy),
    enabled: !!scanId,
  })

  const { data: responseTimes } = useQuery({
    queryKey: ['perf-response-times', scanId, strategy],
    queryFn: () => getPerformanceResponseTimes(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: filmstripData } = useQuery({
    queryKey: ['perf-filmstrip', scanId, strategy],
    queryFn: () => getPerformanceFilmstrip(scanId!, strategy),
    enabled: !!scanId,
  })

  const score = scoreData?.score ?? 0
  const trend = scoreData?.score_change ?? null
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0
  const prevTotalIssues = scoreData?.previous_total_issues ?? null
  const prevCriticalIssues = scoreData?.previous_critical_issues ?? null
  const avgResponseMs = scoreData?.avg_response_time_ms ?? null

  const vitals = vitalsData?.pages ?? []
  const avgMetrics = useMemo(() => {
    return VITALS_META.reduce((acc, v) => {
      acc[v.key] = avg(vitals.map((p) => p[v.key]))
      return acc
    }, {} as Record<VitalKey, number | null>)
  }, [vitals])

  const chartData = useMemo(() => {
    const pts = scoreOverTime?.data_points ?? []
    const now = Date.now()
    const cutoff =
      timeFilter === 'Today' ? now - 86_400_000
      : timeFilter === 'Yesterday' ? now - 2 * 86_400_000
      : now - 7 * 86_400_000
    const source = timeFilter === 'Last week' ? pts : pts.filter((p) => new Date(p.scanned_at).getTime() >= cutoff)
    return (source.length ? source : pts).map((p) => ({
      date: new Date(p.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: p.score != null ? Math.round(p.score) : null,
    }))
  }, [scoreOverTime, timeFilter])

  if (!websiteId) return <EmptyState msg="Select a website from the top bar." />
  if (!scanId) return <EmptyState msg="No completed scans yet. Run a scan to see performance data." />

  if (pageDetailView) {
    return (
      <PerformancePageDetail
        scanJobId={scanId}
        scanResultId={pageDetailView.scanResultId}
        pageUrl={pageDetailView.pageUrl}
        onBack={() => setPageDetailView(null)}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-[#d8dde9] px-4 sm:px-6">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-3.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab ? 'border-[#0b66e4] text-[#242424] font-semibold' : 'border-transparent text-[#73767f] font-normal hover:text-gray-700')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard tab */}
      {activeTab === 'Dashboard' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* === HERO CARD === */}
          <div className="bg-white rounded-[8px] border border-[#9db7f4] p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
              {/* Left: text + button */}
              <div className="flex flex-col justify-between lg:w-[30%] min-w-0">
                <div>
                  <h2 className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.48px] leading-[1.4] mb-4">
                    Speed Is Your Competitive Edge
                  </h2>
                  <p className="text-[13px] text-[#505050] mb-2">Presenting your website's Performance score.</p>
                  <p className="text-[13px] text-[#73767f] mb-6">Ensure an exceptional online experience for your users.</p>
                </div>
                <Link to="/performance" search={{ tab: 'Issues list', issueId: undefined }}
                  className="inline-flex items-center justify-center bg-[#0b66e4] text-white text-[14px] font-medium rounded-[4px] px-8 py-3.5 self-start">
                  View all issues
                </Link>
              </div>

              {/* Center: score gauge */}
              <div className="flex-1 flex flex-col items-center justify-center py-2">
                <div className="relative overflow-hidden" style={{ width: 220, height: 175 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ value: score }, { value: Math.max(0, 100 - score) }]}
                        cx="50%" cy="52%" startAngle={225} endAngle={-45}
                        innerRadius={68} outerRadius={90} dataKey="value" strokeWidth={0}>
                        <Cell fill={score < 50 ? '#d93025' : score < 80 ? '#f59e0b' : '#22c55e'} />
                        <Cell fill="#eeeeee" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute left-0 right-0 flex flex-col items-center pointer-events-none" style={{ top: '56%', transform: 'translateY(-50%)' }}>
                    <div className={`flex items-baseline font-semibold ${score < 50 ? 'text-[#d93025]' : score < 80 ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`} style={{ letterSpacing: '-0.91px' }}>
                      <span className="text-[48px] leading-none">{score}</span>
                      <span className="text-[34px] leading-none">%</span>
                    </div>
                    <div className="text-[15px] font-medium text-[#2e3240] mt-1.5">Overall score</div>
                  </div>
                </div>
                {trend != null && (
                  <div className={cn('flex items-center gap-1 text-[14px] font-semibold mt-1', trend >= 0 ? 'text-[#0a843f]' : 'text-[#d93025]')}>
                    {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend))}%
                  </div>
                )}
              </div>

              {/* Right: stats cards */}
              <div className="shrink-0 lg:w-[30%] flex flex-col gap-3">
                {/* Avg Response Time */}
                <div className="bg-white border border-[#ced6ed] rounded-[8px] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-[13px] font-medium text-[#505050] tracking-[-0.26px]">Avg Response Time (sec)</div>
                    <img src={AvgResponseTimeSvg} alt="" className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[24px] font-semibold text-[#2e3240] tracking-[-0.48px] leading-none">
                      {avgResponseMs != null ? `${(avgResponseMs / 1000).toFixed(2)} s` : '—'}
                    </span>
                    {scoreData?.avg_response_time_change_percent != null && (
                      <span className={cn(
                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[12px] font-semibold',
                        scoreData.avg_response_time_change_percent >= 0 ? 'bg-[#e6f7ed] text-[#0a843f]' : 'bg-red-50 text-[#d93025]'
                      )}>
                        {scoreData.avg_response_time_change_percent >= 0 ? '↗' : '↘'} {Math.abs(scoreData.avg_response_time_change_percent).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                {/* Total / Critical issues */}
                <div className="bg-white border border-[#ced6ed] rounded-[8px] p-4 flex items-start gap-2 flex-1">
                  <div className="flex-1">
                    <div>
                      <div className="text-[14px] font-medium text-[#141414] tracking-[-0.28px] mb-2">Total issues</div>
                      <div className="text-[24px] font-semibold text-[#d93025] tracking-[-0.48px] leading-none">
                        {String(totalIssues).padStart(2, '0')}
                      </div>
                      {prevTotalIssues != null && (
                        <div className="text-[12px] text-[#73767f] mt-1">Previous count : {String(prevTotalIssues).padStart(2, '0')}</div>
                      )}
                    </div>
                    <div className="h-px bg-gray-100 my-3.5" />
                    <div>
                      <div className="text-[14px] font-medium text-[#141414] tracking-[-0.28px] mb-2">Critical issues</div>
                      <div className="text-[24px] font-semibold text-[#d93025] tracking-[-0.48px] leading-none">
                        {String(criticalCount).padStart(2, '0')}
                      </div>
                      {prevCriticalIssues != null && (
                        <div className="text-[12px] text-[#73767f] mt-1">Previous count : {String(prevCriticalIssues).padStart(2, '0')}</div>
                      )}
                    </div>
                  </div>
                  <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0 mt-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Web vitals */}
          <div className="bg-white rounded-[8px] border border-[#dfe4f3] p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-0.5">Web vitals</h3>
            {filmstripData && filmstripData.pages.length > 0 && filmstripData.pages[0].frames.length > 0 && (
              <div className="flex gap-3 mb-5 mt-3 px-3 w-full">
                {filmstripData.pages[0].frames.map((frame, i) => (
                  <div key={i} className="flex flex-col items-center flex-1 min-w-0 gap-1.5">
                    <img
                      src={frame.data}
                      alt={`Frame at ${frame.timing}ms`}
                      className="w-[85%] rounded border border-gray-200 bg-gray-100"
                    />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{frame.timing}ms</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {VITALS_META.map(({ key, abbr, label, unit, good, needs }) => {
                const raw = avgMetrics[key]
                const display = formatVital(key, raw, unit)

                // Scale: 0 → (2·needs − good), splitting into 3 zones
                const max = needs * 2 - good
                const pct = raw != null ? Math.min((raw / max) * 100, 100) : 0
                const gW = (good / max) * 100
                const yW = ((needs - good) / max) * 100
                const rW = 100 - gW - yW

                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <div className="text-lg font-bold text-gray-900">{abbr}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {label}
                    </div>

                    {/* Segmented bar with tick */}
                    <div className="relative pt-3">
                      {raw != null && (
                        <div
                          className="absolute top-0 w-px h-3 bg-gray-800"
                          style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                        />
                      )}
                      <div className="flex h-[5px] gap-0.5">
                        <div className="rounded-l-sm bg-green-500" style={{ flex: gW }} />
                        <div className="bg-yellow-400" style={{ flex: yW }} />
                        <div className="rounded-r-sm bg-red-500" style={{ flex: rW }} />
                      </div>
                    </div>

                    {/* Value label anchored to tick position */}
                    <div className="relative h-5">
                      <span
                        className="absolute text-sm font-semibold text-gray-700 whitespace-nowrap -translate-x-1/2"
                        style={{ left: `${pct}%` }}
                      >
                        {display}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Performance over time */}
          <div className="bg-white rounded-[8px] border border-[#dfe4f3] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Performance over time</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {TIME_FILTERS.map((f) => (
                  <button key={f} onClick={() => setTimeFilter(f)}
                    className={cn('border rounded-[24px] px-3 py-1.5 text-[10px] transition-colors',
                      timeFilter === f ? 'bg-[#0b66e4] text-white border-[#0b66e4]' : 'border-[#e0e2e7] text-[#242424]')}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              {isBasicPlan && <LockedOverlay label="Upgrade to see performance trends over time" />}
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                      formatter={(v) => [`${v}%`, 'Score']} />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                      fill="url(#perfGrad)" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#3b82f6' }} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                  Not enough historical data yet
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: response times + critical issues */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            <div className="flex-1 bg-white rounded-[8px] border border-[#dfe4f3] p-5">
              <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px] mb-1">Response time of each page</h3>
              <p className="text-[12px] text-[#73767f] mb-4">Time taken by each page to respond</p>
              {!responseTimes || responseTimes.pages.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No page data available</p>
              ) : (() => {
                const pages = responseTimes.pages.slice(0, isBasicPlan ? 5 : 8)
                const maxMs = Math.max(...pages.map(p => p.response_time_ms ?? 0))
                const chartData = pages.map(p => ({
                  name: (p.title || p.page_url.replace(/^https?:\/\//, '')).slice(0, 40),
                  value: p.response_time_ms != null ? +(p.response_time_ms / 1000).toFixed(2) : 0,
                  isSlowest: p.response_time_ms === maxMs,
                }))
                return (
                  <>
                  <ResponsiveContainer width="100%" height={chartData.length * 52 + 30}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                      <XAxis type="number" tickFormatter={v => `${v} sec`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <RTooltip formatter={(v) => [`${v} s`, 'Response time']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.isSlowest ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {isBasicPlan && <LimitedListUpgradeFooter totalCount={responseTimes.pages.length} shown={5} />}
                  </>
                )
              })()}
            </div>

            <div className="w-full lg:w-[340px] shrink-0 bg-white rounded-[8px] border border-[#dfe4f3] p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Critical issues</h3>
                <Link to="/performance" search={{ tab: 'Issues list', issueId: undefined }}
                  className="text-[14px] font-medium text-[#0b66e4] whitespace-nowrap">
                  View all issues →
                </Link>
              </div>
              {(criticalData?.items ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No critical performance issues</p>
              ) : (
                <div className="divide-y divide-[#f5f5f5]">
                  {(criticalData?.items ?? []).slice(0, 7).map((issue) => (
                    <div key={issue.rule_id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-[6px] bg-[#f0f4ff] flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4 text-[#4a6890]" />
                        </div>
                        <span className="text-[13px] text-[#2e3240] leading-snug line-clamp-2">{issue.title}</span>
                      </div>
                      <span className="shrink-0 px-3 py-1 bg-[#e5eeff] text-[#0b66e4] text-[12px] font-medium rounded-[4px] whitespace-nowrap">
                        {issue.pages_affected} fixes
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* === ISSUES LOG === */}
          <div className="bg-white rounded-[8px] border border-[#dfe4f3] p-6">
            <div className="mb-5">
              <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Issues log</h3>
              <p className="text-[12px] text-[#73767f] mt-1 tracking-[-0.24px]">
                Optimise your website for peak performance by resolving these issues
              </p>
            </div>
            {!dashIssues || dashIssues.items.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No issues found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f2f3f8]">
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 rounded-l-[8px]">Name</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-44">Page URL</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-28">Priority</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-24 rounded-r-[8px]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashIssues.items.slice(0, 8).map((item, idx) => {
                        const priority = item.priority ?? 'low'
                        return (
                          <tr key={item.issue_id} className={cn('border-t border-[#eaebec] transition-colors', isBasicPlan && idx >= 5 ? 'blur-sm select-none pointer-events-none' : 'hover:bg-gray-50/60')}>
                            <td className="px-4 py-[18px] text-[14px] text-[#252833] tracking-[-0.14px] leading-snug">{item.title}</td>
                            <td className="px-4 py-[18px]">
                              {item.page_url ? (
                                <a href={item.page_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[13px] text-[#0a5dcf] underline truncate block max-w-[160px]">
                                  {item.page_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                </a>
                              ) : <span className="text-[13px] text-[#9fa1a7]">—</span>}
                            </td>
                            <td className="px-4 py-[18px]">
                              <PriorityBadge priority={priority} />
                            </td>
                            <td className="px-4 py-[18px]">
                              <Link to="/performance" search={{ tab: 'Issues list', issueId: undefined }} className="text-[14px] font-medium text-[#0a5dcf] underline">View more</Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {isBasicPlan && dashIssues.items.length > 5 && (
                  <div className="text-center py-6 border-t border-gray-100 mt-2">
                    <p className="text-[14px] text-[#2e3240] mb-4">Your free plan shows only 5 issues. Upgrade to unlock all issues and get the full picture of your website's health.</p>
                    <Link to="/upgrade" className="inline-block bg-[#2563eb] text-white text-[14px] font-medium px-8 py-2.5 rounded-[6px] hover:bg-blue-700 transition-colors">Unlock all issues</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Affected pages tab */}
      {activeTab === 'Affected pages' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4">
          {/* Top: page cards */}
          <div className="bg-white rounded-[8px] border border-[#9db7f4] p-5">
            <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px] mb-1">Performance issues per page</h3>
            <p className="text-[12px] text-[#73767f] mb-5">Pages with most issues</p>
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No page data</p>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-2">
                {affectedPages.items.slice(0, 8).map((item, i) => {
                  const s = item.page_score ?? 0
                  const barColor = s < 50 ? '#d12929' : s < 80 ? '#e08632' : '#219653'
                  const name = pageName(item.page_url)
                  return (
                    <div key={i} className="shrink-0 relative" style={{ width: 224, height: 295 }}>
                      <div className="absolute bg-[#eceefb] border border-[#dadada] rounded-[6.4px]"
                        style={{ top: 3, left: 1, width: 224, height: 257 }} />
                      <button
                        onClick={() => item.scan_result_id && item.total_issues > 0 && setPageDetailView({ scanResultId: item.scan_result_id, pageUrl: item.page_url })}
                        disabled={!item.scan_result_id || item.total_issues === 0}
                        className="absolute inset-0 bg-white border border-[#dadada] rounded-[6.4px] overflow-hidden flex flex-col text-left hover:shadow-md transition-shadow cursor-pointer"
                        style={{ height: 288 }}
                      >
                        <div className="relative h-[125px] bg-gray-100 rounded-t-[6.4px] overflow-hidden shrink-0">
                          {item.screenshot
                            ? <img src={item.screenshot} alt="" className="w-full h-full object-cover object-top" />
                            : <div className="w-full h-full flex items-center justify-center px-2 text-center"><span className="text-xs text-gray-400 leading-snug">{name}</span></div>
                          }
                          <div className="absolute inset-x-0 bottom-0 h-[14px]"
                            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.8))' }} />
                        </div>
                        <div className="h-px bg-[#ebebeb]" />
                        <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-1">
                          <span className="text-[13px] font-semibold text-[#2e3240] leading-tight line-clamp-2 flex-1">{name}</span>
                          <a href={item.page_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 mt-0.5">
                            <img src={UrlSvg} alt="" className="w-[18px] h-[18px]" />
                          </a>
                        </div>
                        <div className="flex-1" />
                        <div className="flex gap-5 px-3 pb-2">
                          <div>
                            <div className="text-[22px] font-semibold text-[#2e3240] leading-none">{item.total_issues}</div>
                            <div className="text-[10px] text-[#73767f] mt-0.5">Total issues</div>
                          </div>
                          <div>
                            <div className="text-[22px] font-semibold text-[#2e3240] leading-none">{item.critical_issues}</div>
                            <div className="text-[10px] text-[#73767f] mt-0.5">Critical issues</div>
                          </div>
                        </div>
                        <div className="h-[7px] rounded-b-[6.4px]" style={{ backgroundColor: barColor }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom: pages list table */}
          <div className="bg-white rounded-[8px] border border-[#9db7f4] overflow-hidden">
            <div className="flex items-center justify-between p-5 gap-3 flex-wrap">
              <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Pages list</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-[rgba(159,159,159,0.92)] rounded-[4px] px-3 h-[43px]" style={{ width: 313 }}>
                  <Search className="w-4 h-4 text-[#9f9f9f] shrink-0" />
                  <input
                    type="text"
                    placeholder="Search by pages"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setAffectedPage(1) } }}
                    className="text-[13px] text-[#2e3240] placeholder-[#9f9f9f] outline-none flex-1 bg-transparent"
                  />
                </div>
                <button className="w-[43px] h-[43px] flex items-center justify-center rounded-[4px] border border-[#e0e2e7] hover:bg-gray-50 text-[#73767f]">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button className="w-[43px] h-[43px] flex items-center justify-center rounded-[4px] border border-[#e0e2e7] hover:bg-gray-50 text-[#73767f]">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No affected pages found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f2f3f8]">
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-5 py-3 rounded-l-[8px]">Pages</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-5 py-3 w-24">Score</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-5 py-3 w-36">Critical issues</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-5 py-3 w-28 rounded-r-[8px]">Total issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isBasicPlan ? affectedPages.items.slice(0, 8) : affectedPages.items).map((item, i) => {
                        const s = item.page_score ?? 0
                        const shortUrl = item.page_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
                        const locked = isBasicPlan && i >= 5
                        return (
                          <tr key={i}
                            onClick={() => !locked && item.scan_result_id && item.total_issues > 0 && setPageDetailView({ scanResultId: item.scan_result_id, pageUrl: item.page_url })}
                            className={cn('border-b border-[#ebebeb] transition-colors', locked ? 'blur-sm select-none pointer-events-none' : 'hover:bg-gray-50/60', item.scan_result_id && item.total_issues > 0 && 'cursor-pointer')}>
                            <td className="px-5 py-4">
                              <div className="text-[14px] font-medium text-[#2e3240]">{pageName(item.page_url)}</div>
                              <div className="text-[12px] text-[#73767f] mt-0.5">
                                URL : <a href={item.page_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="underline text-[#73767f]">{shortUrl}</a>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold" style={{ color: scoreColor(s) }}>{s}%</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] font-semibold text-[#d93025]">{item.critical_issues}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[14px] text-[#2e3240]">{item.total_issues}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {isBasicPlan ? (
                  <LimitedListUpgradeFooter totalCount={affectedPages.total} shown={5} />
                ) : (
                  <Pagination page={affectedPage} totalPages={affectedPages.total_pages} onPage={setAffectedPage} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Issues list tab */}
      {activeTab === 'Issues list' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-[16px] font-semibold text-[#2e3240]">All issues</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-gray-300 rounded-[6px] px-3 h-9 w-52">
                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search issues"
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  className="text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 bg-transparent"
                />
              </div>
            </div>
          </div>

          {!issueList ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
          ) : (() => {
            const filtered = issueList.items.filter((item) => {
              if (issueSearch && !item.title.toLowerCase().includes(issueSearch.toLowerCase())) return false
              return true
            })
            const displayed = isBasicPlan ? filtered.slice(0, 8) : filtered
            return filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No issues found</p>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-[8px] overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f2f3f8]">
                        <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3">Issues</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-44">Pages affected</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-40">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((item, idx) => (
                        <tr key={item.id}
                          onClick={() => !(isBasicPlan && idx >= 5) && setSelectedIssueId(item.id)}
                          className={cn('border-t border-gray-100 transition-colors', isBasicPlan && idx >= 5 ? 'blur-sm select-none pointer-events-none' : 'hover:bg-gray-50/60 cursor-pointer')}>
                          <td className="px-5 py-4">
                            <span className="text-sm text-[#0a5dcf] leading-snug">{item.title}</span>
                          </td>
                          <td className="px-5 py-4 text-[14px] text-[#2e3240]">{item.pages_affected}</td>
                          <td className="px-5 py-4">
                            <PriorityBadge priority={item.priority} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isBasicPlan ? (
                  <LimitedListUpgradeFooter totalCount={issueList.total} shown={5} />
                ) : (
                  <Pagination page={issueListPage} totalPages={issueList.total_pages} onPage={setIssueListPage} />
                )}
              </>
            )
          })()}
        </div>
      )}

      {selectedIssueId && (
        <IssueDetailPanel issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} />
      )}
    </div>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
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

