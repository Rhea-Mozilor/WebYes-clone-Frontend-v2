import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  Loader2,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Download,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import {
  getWebsiteScanHistory,
  getPerformanceScore,
  getPerformanceVitals,
  getPerformanceCriticalIssues,
  getPerformanceScoreOverTime,
  getPerformanceAffectedPages,
  getPerformanceIssueList,
  getPerformanceResponseTimes,
  getPerformanceFilmstrip,
} from '../../api/scans'

export const Route = createFileRoute('/_app/performance')({
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

function vitalColor(value: number, good: number, needs: number) {
  if (value <= good) return '#22c55e'
  if (value <= needs) return '#f59e0b'
  return '#ef4444'
}

function vitalPercent(value: number, _good: number, needs: number) {
  return Math.min(100, Math.round((value / (needs * 1.5)) * 100))
}

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

function priorityBadge(priority: string) {
  if (priority === 'high') return 'bg-red-100 text-red-700'
  if (priority === 'medium') return 'bg-amber-50 text-amber-700'
  return 'bg-gray-100 text-gray-500'
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

function derivePriority(score: number | null, critical: number): string {
  if (score !== null && score < 50) return 'high'
  if (critical > 0) return 'medium'
  return 'low'
}

function PerformancePage() {
  const { websiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [timeFilter, setTimeFilter] = useState<typeof TIME_FILTERS[number]>('Last week')
  const [affectedPage, setAffectedPage] = useState(1)
  const [issueListPage, setIssueListPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId!),
    enabled: !!websiteId,
  })

  const completedScans = history.filter((h) => h.status === 'completed')
  const latestScan = completedScans[0]

  const { data: scoreData } = useQuery({
    queryKey: ['perf-score', latestScan?.scan_job_id],
    queryFn: () => getPerformanceScore(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: vitalsData } = useQuery({
    queryKey: ['perf-vitals', latestScan?.scan_job_id],
    queryFn: () => getPerformanceVitals(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: criticalData } = useQuery({
    queryKey: ['perf-critical', latestScan?.scan_job_id],
    queryFn: () => getPerformanceCriticalIssues(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['perf-over-time', latestScan?.scan_job_id],
    queryFn: () => getPerformanceScoreOverTime(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: affectedPages } = useQuery({
    queryKey: ['perf-affected', latestScan?.scan_job_id, affectedPage, search],
    queryFn: () => getPerformanceAffectedPages(latestScan!.scan_job_id, affectedPage, 10, search),
    enabled: !!latestScan && activeTab === 'Affected pages',
  })

  const { data: issueList } = useQuery({
    queryKey: ['perf-issue-list', latestScan?.scan_job_id, issueListPage],
    queryFn: () => getPerformanceIssueList(latestScan!.scan_job_id, issueListPage, 10),
    enabled: !!latestScan && activeTab === 'Issues list',
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['perf-dash-issues', latestScan?.scan_job_id],
    queryFn: () => getPerformanceIssueList(latestScan!.scan_job_id, 1, 5),
    enabled: !!latestScan,
  })

  const { data: responseTimes } = useQuery({
    queryKey: ['perf-response-times', latestScan?.scan_job_id],
    queryFn: () => getPerformanceResponseTimes(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: filmstripData } = useQuery({
    queryKey: ['perf-filmstrip', latestScan?.scan_job_id],
    queryFn: () => getPerformanceFilmstrip(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const score = scoreData?.score ?? 0
  const trend = scoreData?.score_change_percent ?? null
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0
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
  if (isLoading) return <Spinner />
  if (!latestScan) return <EmptyState msg="No completed scans yet. Run a scan to see performance data." />

  return (
    <div className="flex flex-col min-h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard tab */}
      {activeTab === 'Dashboard' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            {/* Hero + gauge */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-3">
                    A high performing website is<br className="hidden sm:block" />
                    uncompromisable.
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">Presenting your website's Performance score.</p>
                  <p className="text-sm text-gray-400 mb-6">Ensure an exceptional online experience for your users.</p>
                  <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                    className="inline-flex items-center px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
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
                      <span className="text-xs text-gray-400 text-center leading-tight">Overall score</span>
                    </div>
                  </div>
                  {trend != null && trend !== 0 && (
                    <div className={cn('flex items-center gap-1 text-sm font-medium mt-1', trend > 0 ? 'text-green-600' : 'text-red-500')}>
                      {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(Math.round(trend))}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Avg Response Time (sec)</span>
                  <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {avgResponseMs != null ? `${(avgResponseMs / 1000).toFixed(2)} s` : '—'}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                      Total issues <Info className="w-3 h-3 text-gray-300" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{String(totalIssues).padStart(2, '0')}</div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div className="h-px bg-gray-50" />
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                    Critical issues <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-2xl font-bold text-red-500">{String(criticalCount).padStart(2, '0')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Web vitals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
                const color = raw != null ? vitalColor(raw, good, needs) : '#d1d5db'
                const pct = raw != null ? vitalPercent(raw, good, needs) : 0
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="text-lg font-bold text-gray-900">{abbr}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      {label} <Info className="w-3 h-3 text-gray-300 shrink-0" />
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-green-400 via-amber-400 to-red-400">
                      <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                        style={{ left: `calc(${pct}% - 5px)`, backgroundColor: color }} />
                    </div>
                    <div className="text-sm font-semibold text-gray-700">{display}</div>
                  </div>
                )
              })}
            </div>

          </div>

          {/* Performance over time */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-sm font-bold text-gray-900">Performance over time</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {TIME_FILTERS.map((f) => (
                  <button key={f} onClick={() => setTimeFilter(f)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      timeFilter === f ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50 border border-gray-200')}>
                    {f}
                  </button>
                ))}
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50">
                  <Calendar className="w-3.5 h-3.5" />
                  Custom range
                </button>
              </div>
            </div>
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

          {/* Issues log */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Issues log {dashIssues ? `(${dashIssues.total})` : ''}</h3>
              <button onClick={() => setActiveTab('Issues list')}
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
                      <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4 w-24">Priority</th>
                      <th className="text-right text-xs font-semibold text-gray-500 pb-2 w-28">Pages affected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dashIssues.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/issues/${item.id}`}>
                        <td className="py-2.5 pr-4">
                          <div className="text-xs text-blue-700 font-medium hover:underline">{item.title}</div>
                          {item.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</div>}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadge(item.priority))}>
                            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="text-xs text-gray-600">{item.pages_affected}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom row: response times + critical issues */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Response time of each page</h3>
              {!responseTimes || responseTimes.pages.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No page data available</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex text-xs font-semibold text-gray-400 pb-1 border-b border-gray-50">
                    <span className="flex-1">Page URL</span>
                    <span className="w-20 text-right">FCP</span>
                  </div>
                  {responseTimes.pages.slice(0, 8).map((page, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-700 truncate">{page.page_url}</span>
                      <span className="w-20 text-right text-gray-600 shrink-0">
                        {page.response_time_ms != null ? `${(page.response_time_ms / 1000).toFixed(2)} s` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Critical issues</h3>
                <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                  className="text-xs text-blue-600 hover:underline font-medium">
                  View more
                </Link>
              </div>
              {(criticalData?.items ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No critical performance issues</p>
              ) : (
                <div className="space-y-2.5">
                  {(criticalData?.items ?? []).slice(0, 6).map((issue) => (
                    <div key={issue.rule_id} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-700 leading-snug">{issue.title}</span>
                        <div className="text-[10px] text-gray-400 mt-0.5">{issue.pages_affected} page{issue.pages_affected !== 1 ? 's' : ''} affected</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Affected pages tab */}
      {activeTab === 'Affected pages' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4">
          {/* Top: most-affected page cards */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-900 mb-1">Performance issues per page</h3>
            <p className="text-xs text-gray-400 mb-4">Pages with most issues</p>
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No page data</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                {affectedPages.items.slice().sort((a, b) => b.total_issues - a.total_issues).slice(0, 8).map((item, i) => {
                  const s = item.page_score ?? 0
                  const prio = derivePriority(s, item.critical_issues)
                  const barColor = prio === 'high' ? '#ef4444' : prio === 'medium' ? '#f59e0b' : '#22c55e'
                  const name = pageName(item.page_url)
                  return (
                    <div key={i} className="shrink-0 w-44 rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                      <div className="h-28 bg-gray-100 overflow-hidden">
                        {item.screenshot
                          ? <img src={item.screenshot} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center px-2 text-center"><span className="text-xs text-gray-400 leading-snug">{name}</span></div>
                        }
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setAffectedPage(1) } }}
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
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No affected pages found</p>
            ) : (
              <>
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
                      {affectedPages.items.map((item, i) => {
                        const s = item.page_score ?? 0
                        const prio = derivePriority(s, item.critical_issues)
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
                              <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadge(prio))}>
                                {prio.charAt(0).toUpperCase() + prio.slice(1)}
                              </span>
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
                <Pagination page={affectedPage} totalPages={affectedPages.total_pages} onPage={setAffectedPage} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Issues list tab */}
      {activeTab === 'Issues list' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">
              Issues {issueList ? `(${issueList.total})` : ''}
            </h3>
            {!issueList ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : issueList.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No issues found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Issue</th>
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4 w-28">Priority</th>
                        <th className="text-right text-xs font-semibold text-gray-500 pb-3 w-28">Pages affected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {issueList.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4">
                            <div className="text-xs text-gray-800 font-medium">{item.title}</div>
                            {item.description && (
                              <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</div>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={cn('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityBadge(item.priority))}>
                              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-xs text-gray-600">{item.pages_affected}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={issueListPage} totalPages={issueList.total_pages} onPage={setIssueListPage} />
              </>
            )}
          </div>
        </div>
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

function Spinner() {
  return (
    <div className="flex items-center justify-center h-full py-32">
      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
    </div>
  )
}
