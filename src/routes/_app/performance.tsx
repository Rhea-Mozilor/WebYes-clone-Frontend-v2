import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { getWebsiteScanHistory, getScanSummary, getPageVitals } from '../../api/scans'
import { listIssues } from '../../api/issues'
import type { PageVitals } from '../../types'

export const Route = createFileRoute('/_app/performance')({
  component: PerformancePage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issues list']

// Web vitals metadata
const VITALS = [
  { key: 'fcp_ms' as const, abbr: 'FCP', label: 'First Contentful Paint', unit: 's', good: 1800, needs: 3000 },
  { key: 'lcp_ms' as const, abbr: 'LCP', label: 'Largest Contentful Paint', unit: 's', good: 2500, needs: 4000 },
  { key: 'tbt_ms' as const, abbr: 'TBT', label: 'Total Blocking Time', unit: 's', good: 200, needs: 600 },
  { key: 'cls' as const, abbr: 'CLS', label: 'Cumulative Layout Shift', unit: '', good: 0.1, needs: 0.25 },
  { key: 'speed_index_ms' as const, abbr: 'SI', label: 'Speed Index', unit: 'ms', good: 3400, needs: 5800 },
]

function vitalColor(value: number, goodThreshold: number, needsThreshold: number) {
  if (value <= goodThreshold) return '#22c55e'
  if (value <= needsThreshold) return '#f59e0b'
  return '#ef4444'
}

function vitalPercent(value: number, _good: number, needs: number) {
  const max = needs * 1.5
  return Math.min(100, Math.round((value / max) * 100))
}

function formatVital(key: keyof PageVitals['metrics'], value: number | null, unit: string) {
  if (value == null) return '—'
  if (key === 'cls') return value.toFixed(2)
  if (unit === 's') return `${(value / 1000).toFixed(1)} s`
  if (unit === 'ms') return value > 0 ? `${Math.round(value)} ms` : '0ms'
  return `${value}`
}

// Average a metric across all pages
function avgVital(pages: PageVitals[], key: keyof PageVitals['metrics']): number | null {
  const vals = pages.map((p) => p.metrics[key]).filter((v): v is number => v != null)
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function PerformancePage() {
  const { websiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState('Dashboard')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId!),
    enabled: !!websiteId,
  })

  const completedScans = history.filter((h) => h.status === 'completed')
  const latestScan = completedScans[0]
  const prevScan = completedScans[1]

  const { data: summary } = useQuery({
    queryKey: ['summary', latestScan?.scan_job_id],
    queryFn: () => getScanSummary(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', latestScan?.scan_job_id],
    queryFn: () => getPageVitals(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: issues = [] } = useQuery({
    queryKey: ['issues-performance', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id, category: 'performance' }),
    enabled: !!latestScan,
  })

  const score = Math.round(summary?.scores?.performance?.avg ?? 0)
  const prevScore = prevScan?.avg_performance
  const trend = prevScore != null ? Math.round(score - prevScore) : null

  const totalIssues = issues.length
  const criticalCount = issues.filter((i) => i.severity === 'critical').length

  // Avg response time = avg LCP across pages (closest proxy)
  const avgLcp = avgVital(vitals, 'lcp_ms')
  const avgFcp = avgVital(vitals, 'fcp_ms')

  // Avg metrics across all pages
  const avgMetrics = useMemo(() => {
    return VITALS.reduce((acc, v) => {
      acc[v.key] = avgVital(vitals, v.key)
      return acc
    }, {} as Record<string, number | null>)
  }, [vitals])

  // Worst page for web vitals display
  const homePage = vitals[0]

  // ── Guards ─────────────────────────────────────────────────────
  if (!websiteId) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <p className="text-sm text-gray-400">Select a website from the top bar.</p>
      </div>
    )
  }
  if (isLoading || (latestScan && !summary)) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
      </div>
    )
  }
  if (!latestScan) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <p className="text-sm text-gray-400">No completed scans yet. Run a scan to see performance data.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">

        {/* Top row */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">

          {/* Left hero + gauge */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Text */}
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-3">
                  A high performing website is<br className="hidden sm:block" />
                  uncompromisable.
                </h2>
                <p className="text-sm text-gray-600 mb-1">Presenting your website's Performance score.</p>
                <p className="text-sm text-gray-400 mb-6">Ensure an exceptional online experience for your users.</p>

                <Link
                  to="/scans/$scanId/issues"
                  params={{ scanId: latestScan.scan_job_id }}
                  className="inline-flex items-center px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View all issues
                </Link>
              </div>

              {/* Gauge */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: score }, { value: 100 - score }]}
                        cx="50%"
                        cy="50%"
                        startAngle={90}
                        endAngle={-270}
                        innerRadius={55}
                        outerRadius={75}
                        dataKey="value"
                        strokeWidth={0}
                      >
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
                    {Math.abs(trend)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            {/* Avg response time */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Avg Response Time (sec)</span>
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {avgLcp != null ? `${(avgLcp / 1000).toFixed(2)} s` : '—'}
                </span>
                {avgFcp != null && avgLcp != null && (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {((avgFcp / avgLcp) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Total + Critical issues */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                    Total issues <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{String(totalIssues).padStart(2, '0')}</div>
                  {prevScan && (
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Info className="w-3 h-3" /> Previous count : {prevScan.avg_performance != null ? Math.round(prevScan.avg_performance) : '—'}
                    </div>
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
                <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Info className="w-3 h-3" /> Previous count : 01
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Web vitals section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-0.5">Web vitals</h3>
          {homePage && (
            <p className="text-xs text-gray-400 mb-5">
              Home page:{' '}
              <a href={homePage.page_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline">{homePage.page_url}</a>
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {VITALS.map(({ key, abbr, label, unit, good, needs }) => {
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

                  {/* Color bar */}
                  <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-green-400 via-amber-400 to-red-400">
                    {/* Marker */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow"
                      style={{ left: `calc(${pct}% - 5px)`, backgroundColor: color }}
                    />
                  </div>

                  <div className="text-sm font-semibold text-gray-700">{display}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom row: response time per page + critical issues */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">

          {/* Response time per page */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Response time of each page</h3>
            {vitals.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No page data available</p>
            ) : (
              <div className="space-y-3">
                <div className="flex text-xs font-semibold text-gray-400 pb-1 border-b border-gray-50">
                  <span className="flex-1">Page URL</span>
                  <span className="w-20 text-right">LCP</span>
                  <span className="w-16 text-right">Score</span>
                </div>
                {vitals.slice(0, 8).map((page, i) => {
                  const lcp = page.metrics.lcp_ms
                  const s = page.performance_score
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-700 truncate">{page.page_url}</span>
                      <span className="w-20 text-right text-gray-600 shrink-0">
                        {lcp != null ? `${(lcp / 1000).toFixed(2)} s` : '—'}
                      </span>
                      <span
                        className="w-16 text-right font-semibold shrink-0"
                        style={{ color: s != null ? vitalColor(s, 90, 50) : '#9ca3af' }}
                      >
                        {s != null ? `${s}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Critical issues */}
          <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Critical issues</h3>
              <Link
                to="/scans/$scanId/issues"
                params={{ scanId: latestScan.scan_job_id }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                View more
              </Link>
            </div>

            {issues.filter((i) => i.severity === 'critical').length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No critical performance issues</p>
            ) : (
              <div className="space-y-2.5">
                {issues
                  .filter((i) => i.severity === 'critical')
                  .filter((v, idx, arr) => arr.findIndex((x) => x.rule_id === v.rule_id) === idx)
                  .slice(0, 6)
                  .map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <span className="text-xs text-gray-700 leading-snug">{issue.title}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
