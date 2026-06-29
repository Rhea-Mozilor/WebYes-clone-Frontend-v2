import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { AlertTriangle, Info, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { getWebsiteScanHistory, getScanSummary, getSeoScoreOverTime } from '../../api/scans'
import { listIssues } from '../../api/issues'

export const Route = createFileRoute('/_app/seo')({
  component: SeoPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issue list']

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: 'Excellent', color: '#22c55e' }
  if (score >= 70) return { text: 'Good', color: '#f59e0b' }
  if (score >= 50) return { text: 'Needs Improvement', color: '#f97316' }
  return { text: 'Poor', color: '#ef4444' }
}

function SeoPage() {
  const { websiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState('Dashboard')

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId!),
    enabled: !!websiteId,
  })

  const completedScans = history.filter((h) => h.status === 'completed')
  const latestScan = completedScans[0]

  const { data: summary } = useQuery({
    queryKey: ['summary', latestScan?.scan_job_id],
    queryFn: () => getScanSummary(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: issues = [] } = useQuery({
    queryKey: ['issues-seo', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id, category: 'seo' }),
    enabled: !!latestScan,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['seo-score-over-time', latestScan?.scan_job_id],
    queryFn: () => getSeoScoreOverTime(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const score = Math.round(summary?.scores?.seo?.avg ?? 0)
  const label = scoreLabel(score)
  const totalIssues = issues.length
  const criticalCount = issues.filter((i) => i.severity === 'critical').length

  // Chart data from score-over-time endpoint
  const chartData = useMemo(() =>
    (scoreOverTime?.data_points ?? []).map((pt, i) => ({
      label: `Scan ${i + 1}`,
      score: pt.score ?? 0,
    })),
  [scoreOverTime])

  // Unique critical issues grouped by rule_id with page count
  const criticalGroups = useMemo(() => {
    const map: Record<string, { title: string; count: number }> = {}
    for (const issue of issues.filter((i) => i.severity === 'critical')) {
      if (!map[issue.rule_id]) map[issue.rule_id] = { title: issue.title, count: 0 }
      map[issue.rule_id].count++
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [issues])

  if (!websiteId) return <EmptyState msg="Select a website from the top bar." />
  if (isLoading || (latestScan && !summary)) return <Spinner />
  if (!latestScan) return <EmptyState msg="No completed scans yet. Run a scan to see SEO data." />

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

      <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
        {/* Top row */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Hero + gauge */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-3">
                  An SEO-friendly website ranks higher<br className="hidden sm:block" />
                  and reaches more users.
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Ensure both your on-page and off-page SEO are<br className="hidden sm:block" />
                  optimised to drive traffic and boost conversions.
                </p>
                <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                  className="inline-flex items-center px-5 py-2 border-2 border-blue-600 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors">
                  View all issues
                </Link>
              </div>

              {/* Gauge with colour score */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ value: score }, { value: 100 - score }]}
                        cx="50%" cy="50%" startAngle={90} endAngle={-270}
                        innerRadius={55} outerRadius={75} dataKey="value" strokeWidth={0}>
                        <Cell fill={label.color} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: label.color }}>{score}%</span>
                  </div>
                </div>
                <span className="text-sm font-semibold mt-1" style={{ color: label.color }}>
                  {label.text}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Total + Critical */}
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                  Total issues <Info className="w-3 h-3 text-gray-300" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{totalIssues}</div>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="h-px bg-gray-50" />
            <div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                Critical issues <Info className="w-3 h-3 text-gray-300" />
              </div>
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Critical issues list */}
          <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Critical issues</h3>
              <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                View more →
              </Link>
            </div>
            {criticalGroups.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No critical SEO issues</p>
            ) : (
              <div className="space-y-3">
                {criticalGroups.slice(0, 6).map((g, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 leading-snug">{g.title}</span>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0 font-medium">
                      {g.count} {g.count === 1 ? 'Page' : 'Pages'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO over time */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">SEO over time</h3>
            {chartData.length < 2 ? (
              <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                Need at least 2 scans to show trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                    formatter={(v) => [`${Number(v)}%`, 'SEO']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
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
