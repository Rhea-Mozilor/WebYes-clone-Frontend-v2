import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { AlertTriangle, Info, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import {
  getWebsiteScanHistory,
  getSeoScore,
  getSeoCriticalIssues,
  getSeoScoreOverTime,
  getSeoAffectedPages,
  getSeoIssueList,
} from '../../api/scans'

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

function SeoPage() {
  const { websiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState('Dashboard')
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
    queryKey: ['seo-score', latestScan?.scan_job_id],
    queryFn: () => getSeoScore(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: criticalData } = useQuery({
    queryKey: ['seo-critical', latestScan?.scan_job_id],
    queryFn: () => getSeoCriticalIssues(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['seo-score-over-time', latestScan?.scan_job_id],
    queryFn: () => getSeoScoreOverTime(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const { data: affectedPages } = useQuery({
    queryKey: ['seo-affected', latestScan?.scan_job_id, affectedPage, search],
    queryFn: () => getSeoAffectedPages(latestScan!.scan_job_id, affectedPage, 10, search),
    enabled: !!latestScan && activeTab === 'Affected pages',
  })

  const { data: issueList } = useQuery({
    queryKey: ['seo-issue-list', latestScan?.scan_job_id, issueListPage],
    queryFn: () => getSeoIssueList(latestScan!.scan_job_id, issueListPage, 10),
    enabled: !!latestScan && activeTab === 'Issue list',
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['seo-dash-issues', latestScan?.scan_job_id],
    queryFn: () => getSeoIssueList(latestScan!.scan_job_id, 1, 5),
    enabled: !!latestScan,
  })

  const score = scoreData?.score ?? 0
  const label = scoreLabel(score)
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0

  const chartData = useMemo(() =>
    (scoreOverTime?.data_points ?? []).map((pt, i) => ({
      label: `Scan ${i + 1}`,
      score: pt.score ?? 0,
    })),
  [scoreOverTime])

  if (!websiteId) return <EmptyState msg="Select a website from the top bar." />
  if (isLoading) return <Spinner />
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

      {/* Dashboard tab */}
      {activeTab === 'Dashboard' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
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
                  <span className="text-sm font-semibold mt-1" style={{ color: label.color }}>{label.text}</span>
                </div>
              </div>
            </div>

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
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                      formatter={(v) => [`${Number(v)}%`, 'SEO']} />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">Critical issues</h3>
                <Link to="/scans/$scanId/issues" params={{ scanId: latestScan.scan_job_id }}
                  className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                  View more →
                </Link>
              </div>
              {(criticalData?.items ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No critical SEO issues</p>
              ) : (
                <div className="space-y-3">
                  {(criticalData?.items ?? []).slice(0, 6).map((g) => (
                    <div key={g.rule_id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-700 leading-snug">{g.title}</span>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0 font-medium">
                        {g.pages_affected} {g.pages_affected === 1 ? 'Page' : 'Pages'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Issues log */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Issues log {dashIssues ? `(${dashIssues.total})` : ''}</h3>
              <button onClick={() => setActiveTab('Issue list')}
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
        </div>
      )}

      {/* Affected pages tab */}
      {activeTab === 'Affected pages' && (
        <div className="flex-1 p-3 sm:p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900">
                Affected pages {affectedPages ? `(${affectedPages.total})` : ''}
              </h3>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Search by URL" value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setAffectedPage(1) } }}
                  className="text-xs text-gray-700 placeholder-gray-400 outline-none w-44" />
              </div>
            </div>
            {!affectedPages ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No affected pages found</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left text-xs font-semibold text-gray-500 pb-3 pr-4">Page URL</th>
                        <th className="text-right text-xs font-semibold text-gray-500 pb-3 pr-4 w-24">Score</th>
                        <th className="text-right text-xs font-semibold text-gray-500 pb-3 pr-4 w-28">Total Issues</th>
                        <th className="text-right text-xs font-semibold text-gray-500 pb-3 w-28">Critical</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {affectedPages.items.map((item, i) => {
                        const s = item.page_score ?? 0
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4">
                              <span className="text-xs text-gray-700 truncate block max-w-sm">{item.page_url}</span>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <span className="text-xs font-bold" style={{ color: scoreColor(s) }}>{s}%</span>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <span className="text-xs text-gray-700">{item.total_issues}</span>
                            </td>
                            <td className="py-3 text-right">
                              <span className="text-xs font-semibold text-red-600">{item.critical_issues}</span>
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

      {/* Issue list tab */}
      {activeTab === 'Issue list' && (
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
