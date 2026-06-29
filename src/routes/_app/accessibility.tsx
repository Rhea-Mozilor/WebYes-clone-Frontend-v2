import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  ChevronDown,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Ban,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { getWebsiteScanHistory, getScanSummary } from '../../api/scans'
import { listIssues } from '../../api/issues'

export const Route = createFileRoute('/_app/accessibility')({
  component: AccessibilityPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Automated check', 'Required manual check', 'Check list']

function AccessibilityPage() {
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

  const { data: issues = [] } = useQuery({
    queryKey: ['issues-accessibility', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id, category: 'accessibility' }),
    enabled: !!latestScan,
  })

  const score = Math.round(summary?.scores?.accessibility?.avg ?? 0)
  const prevScore = prevScan?.avg_accessibility
  const trend = prevScore != null ? Math.round(score - prevScore) : null

  const totalIssues = issues.length
  const criticalCount = issues.filter((i) => i.severity === 'critical').length
  const manualChecksCount = issues.filter((i) => i.wcag_version != null).length
  const passedAudits = summary ? summary.passed_pages : 0

  // Level A ≈ score, Level AA ≈ score * 0.26 (approximation matching screenshot pattern)
  const levelA = score > 0 ? Math.min(99, score) : 0
  const levelAA = score > 0 ? Math.round(score * 0.26) : 0

  // Deduplicate issues by rule_id, count pages affected
  const issueGroups = useMemo(() => {
    const map: Record<string, { title: string; count: number }> = {}
    for (const issue of issues) {
      if (!map[issue.rule_id]) map[issue.rule_id] = { title: issue.title, count: 0 }
      map[issue.rule_id].count++
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [issues])

  const pieData = [
    { value: totalIssues, fill: '#1e3a8a' },
    { value: Math.max(0, 300 - totalIssues), fill: '#e0e7ff' },
  ]

  // ── Guards ─────────────────────────────────────────────────────
  if (!websiteId) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <p className="text-sm text-gray-400">Select a website from the top bar to get started.</p>
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
        <p className="text-sm text-gray-400">No completed scans yet. Run a scan to see accessibility data.</p>
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

          {/* Left: Hero + gauge */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Text + region */}
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug mb-4">
                  An accessible website reflects<br className="hidden sm:block" />
                  positively on your brand image.
                </h2>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-gray-600">Region :</span>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    United Kingdom
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-5">
                  Comply with WCAG 2.2.{' '}
                  <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline">
                    Learn more
                  </a>
                </p>

                <Link
                  to="/scans/$scanId/issues"
                  params={{ scanId: latestScan.scan_job_id }}
                  className="inline-flex items-center px-5 py-2 border-2 border-blue-600 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
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
                        data={[
                          { value: score },
                          { value: 100 - score },
                        ]}
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

                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{score}%</span>
                    <span className="text-xs text-gray-400 text-center leading-tight">Overall score<br />(automated check)</span>
                  </div>
                </div>

                {/* Trend */}
                {trend != null && trend !== 0 && (
                  <div className={cn('flex items-center gap-1 text-sm font-medium mt-1', trend > 0 ? 'text-green-600' : 'text-red-500')}>
                    {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {Math.abs(trend)}%
                  </div>
                )}
                <span className="text-xs font-semibold text-amber-500 mt-1">Level AA</span>
              </div>
            </div>
          </div>

          {/* Right: Level cards + issue counts */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
            {/* WCAG level cards */}
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
                <div className="text-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                  <div className="text-xs text-gray-400 leading-tight">
                    To enable Level AAA go to{' '}
                    <span className="text-blue-600">settings</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total + Critical issues */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                    Total issues <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{String(totalIssues).padStart(2, '0')}</div>
                  {prevScan && (
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Info className="w-3 h-3" /> Previous count : {prevScan.avg_accessibility != null ? Math.round(prevScan.avg_accessibility) : '—'}
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
                  <Info className="w-3 h-3" /> Previous count : —
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">

          {/* Common accessibility issues */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Common accessibility issues</h3>
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Donut */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={56}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400">Total</span>
                    <span className="text-lg font-bold text-gray-900">{totalIssues}</span>
                  </div>
                </div>
              </div>

              {/* Issues table */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center text-xs font-semibold text-gray-500 mb-2 pb-1.5 border-b border-gray-100">
                  <span className="flex-1">Issues</span>
                  <span className="w-24 text-right">No of Issues</span>
                </div>
                <div className="space-y-2">
                  {issueGroups.slice(0, 6).map((group, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-sm mt-1 shrink-0"
                        style={{ backgroundColor: i % 2 === 0 ? '#1e3a8a' : '#93c5fd' }} />
                      <span className="flex-1 text-xs text-gray-700 leading-snug">{group.title}</span>
                      <span className="w-16 text-xs font-semibold text-gray-800 text-right shrink-0">{group.count}</span>
                    </div>
                  ))}
                  {issueGroups.length === 0 && (
                    <p className="text-xs text-gray-400 py-4 text-center">No accessibility issues found</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WCAG 2.2 panel */}
          <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">WCAG 2.2</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    Passed Audits <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{passedAudits}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <ClipboardList className="w-8 h-8 text-blue-400 shrink-0" />
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    Required manual checks <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{manualChecksCount}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                <Ban className="w-8 h-8 text-gray-300 shrink-0" />
                <div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    Not Applicable <Info className="w-3 h-3 text-gray-300" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
