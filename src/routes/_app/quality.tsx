import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { AlertTriangle, Info, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { getWebsiteScanHistory, getScanSummary, getQualityScoreOverTime } from '../../api/scans'
import { listIssues } from '../../api/issues'

export const Route = createFileRoute('/_app/quality')({
  component: QualityPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issues list']

function QualityPage() {
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
    queryKey: ['issues-quality', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id, category: 'best_practices' }),
    enabled: !!latestScan,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['quality-score-over-time', latestScan?.scan_job_id],
    queryFn: () => getQualityScoreOverTime(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const score = Math.round(summary?.scores?.best_practices?.avg ?? 0)
  const totalIssues = issues.length
  const criticalCount = issues.filter((i) => i.severity === 'critical').length

  // Chart data from score-over-time endpoint
  const chartData = useMemo(() =>
    (scoreOverTime?.data_points ?? []).map((pt, i) => ({
      label: `Scan ${i + 1}`,
      score: pt.score ?? 0,
    })),
  [scoreOverTime])

  // Unique critical issues grouped by rule_id
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
  if (!latestScan) return <EmptyState msg="No completed scans yet. Run a scan to see quality data." />

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
                  The quality of your website is a<br className="hidden sm:block" />
                  reflection of your quality services.
                </h2>
                <p className="text-sm text-gray-500 mb-1">Ensure quality and build credibility.</p>
                <p className="text-sm text-gray-400 mb-6">Presenting your website's Quality score.</p>
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
                    <span className="text-xs text-gray-400 text-center leading-tight">Overall score</span>
                  </div>
                </div>
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
              <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Info className="w-3 h-3" /> Previous count : 01
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
          {/* Quality over time */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-gray-900">Quality over time</h3>
              <div className="flex items-center gap-1">
                {['Today', 'Yesterday', 'Last week'].map((d) => (
                  <button key={d} className="px-2.5 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length < 2 ? (
              <div className="flex items-center justify-center h-36 text-xs text-gray-400">
                Need at least 2 scans to show trend
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 120]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                    formatter={(v) => [`${Number(v)}%`, 'Quality']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Critical issues */}
          <div className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Critical issues</h3>
              <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                View all issues →
              </Link>
            </div>
            {criticalGroups.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No critical quality issues</p>
            ) : (
              <div className="space-y-2">
                {criticalGroups.slice(0, 8).map((g, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <div className="w-3 h-3 rounded-full bg-blue-400" />
                      </div>
                      <span className="text-xs text-gray-700 truncate">{g.title}</span>
                    </div>
                    <span className="ml-3 text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md shrink-0">
                      {g.count} {g.count === 1 ? 'fix' : 'fixes'}
                    </span>
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
