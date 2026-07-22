import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { AlertTriangle, AlertCircle, Loader2, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Download } from 'lucide-react'
import UrlSvg from '../../components/svgicons/url.svg'
import { cn } from '../../lib/utils'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import { useSiteStore } from '../../store/siteStore'
import { IssueDetailPanel } from '../../components/IssueDetailPanel'
import { CategoryPageDetail } from '../../components/CategoryPageDetail'
import { useIsBasicPlan, LockedOverlay, LimitedListUpgradeFooter } from '../../components/UpgradeLock'
import {
  getQualityScore,
  getQualityCriticalIssues,
  getQualityScoreOverTime,
  getQualityAffectedPages,
  getQualityIssueList,
  getQualityIssuesLog,
} from '../../api/scans'

export const Route = createFileRoute('/_app/quality')({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === 'string' ? s.tab : 'Dashboard') as string,
    issueId: typeof s.issueId === 'string' ? s.issueId : undefined,
  }),
  component: QualityPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issues list']

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

function QualityPage() {
  const isBasicPlan = useIsBasicPlan()
  const { websiteId, strategy, scansByWebsite } = useSiteStore()
  const scanId = websiteId ? scansByWebsite[websiteId]?.scanId ?? null : null
  const { tab: activeTab, issueId: preselectedIssueId } = Route.useSearch()
  const navigate = useNavigate({ from: '/quality' })
  const setActiveTab = (tab: string) => navigate({ search: (s) => ({ ...s, tab }), replace: true })
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
    queryKey: ['quality-score', scanId, strategy],
    queryFn: () => getQualityScore(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: criticalData } = useQuery({
    queryKey: ['quality-critical', scanId, strategy],
    queryFn: () => getQualityCriticalIssues(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['quality-score-over-time', scanId, strategy],
    queryFn: () => getQualityScoreOverTime(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: affectedPages } = useQuery({
    queryKey: ['quality-affected', scanId, affectedPage, search, strategy],
    queryFn: () => getQualityAffectedPages(scanId!, affectedPage, 10, search, strategy),
    enabled: !!scanId && activeTab === 'Affected pages',
  })

  const { data: issueList } = useQuery({
    queryKey: ['quality-issue-list', scanId, issueListPage, strategy],
    queryFn: () => getQualityIssueList(scanId!, issueListPage, 10, strategy),
    enabled: !!scanId && activeTab === 'Issues list',
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['quality-dash-issues-log', scanId, strategy],
    queryFn: () => getQualityIssuesLog(scanId!, 5, strategy),
    enabled: !!scanId,
  })

  const score = scoreData?.score ?? 0
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0
  const prevTotalIssues = scoreData?.previous_total_issues ?? null
  const prevCriticalIssues = scoreData?.previous_critical_issues ?? null
  const trendPct = scoreData?.score_change ?? null

  const chartData = useMemo(() =>
    (scoreOverTime?.data_points ?? []).map((pt, i) => ({
      label: `Scan ${i + 1}`,
      score: pt.score ?? 0,
    })),
  [scoreOverTime])

  if (!websiteId) return <EmptyState msg="Select a website from the top bar." />
  if (!scanId) return <EmptyState msg="No completed scans yet. Run a scan to see quality data." />

  if (pageDetailView) {
    return (
      <CategoryPageDetail
        scanJobId={scanId}
        scanResultId={pageDetailView.scanResultId}
        pageUrl={pageDetailView.pageUrl}
        category="quality"
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
                    Build Credibility Through Quality Excellence
                  </h2>
                  <p className="text-[13px] text-[#505050] mb-2">Ensure quality and build credibility.</p>
                  <p className="text-[13px] text-[#73767f] mb-6">Presenting your website's Quality score.</p>
                </div>
                <Link to="/quality" search={{ tab: 'Issues list', issueId: undefined }}
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
                {trendPct != null && (
                  <div className={cn('flex items-center gap-1 text-[14px] font-semibold mt-1',
                    trendPct >= 0 ? 'text-[#0a843f]' : 'text-[#d93025]')}>
                    {trendPct >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trendPct))}%
                  </div>
                )}
              </div>

              {/* Right: stats card */}
              <div className="shrink-0 lg:w-[30%] flex flex-col">
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

          {/* === ROW 2: Chart + Critical issues === */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            {/* Quality over time */}
            <div className="flex-1 bg-white rounded-[8px] border border-[#dfe4f3] p-5 min-w-0">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Quality over time</h3>
                <div className="flex items-center gap-2">
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Today</button>
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Yesterday</button>
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Last week</button>
                </div>
              </div>
              <div className="relative">
                {isBasicPlan && <LockedOverlay label="Upgrade to see quality trends over time" />}
                {chartData.length < 2 ? (
                  <div className="flex items-center justify-center h-48 text-xs text-gray-400">Need at least 2 scans to show trend</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="qualityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0b66e4" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#0b66e4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                        formatter={(v) => [`${Number(v)}%`, 'Quality']} />
                      <Area type="monotone" dataKey="score" stroke="#0b66e4" strokeWidth={2}
                        fill="url(#qualityGrad)" dot={{ fill: '#06387d', r: 3 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Critical issues panel */}
            <div className="w-full lg:w-[340px] shrink-0 bg-white rounded-[8px] border border-[#dfe4f3] p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Critical issues</h3>
                <Link to="/quality" search={{ tab: 'Issues list', issueId: undefined }}
                  className="text-[14px] font-medium text-[#0b66e4] whitespace-nowrap">
                  View all issues →
                </Link>
              </div>
              {(criticalData?.items ?? []).length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No critical quality issues</p>
              ) : (
                <div className="divide-y divide-[#f5f5f5]">
                  {(criticalData?.items ?? []).slice(0, 7).map((g) => (
                    <div key={g.rule_id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-[6px] bg-[#f0f4ff] flex items-center justify-center shrink-0">
                          <AlertCircle className="w-4 h-4 text-[#4a6890]" />
                        </div>
                        <span className="text-[13px] text-[#2e3240] leading-snug line-clamp-2">{g.title}</span>
                      </div>
                      <span className="shrink-0 px-3 py-1 bg-[#e5eeff] text-[#0b66e4] text-[12px] font-medium rounded-[4px] whitespace-nowrap">
                        {g.pages_affected} fixes
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
                              <Link to="/quality" search={{ tab: 'Issues list', issueId: undefined }} className="text-[14px] font-medium text-[#0a5dcf] underline">View more</Link>
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
            <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px] mb-1">Quality issues per page</h3>
            <p className="text-[12px] text-[#73767f] mb-5">Pages with most issues</p>
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No page data</p>
            ) : (
              <div className="flex gap-5 overflow-x-auto pb-2">
                {affectedPages.items.slice().sort((a, b) => b.total_issues - a.total_issues).slice(0, 8).map((item, i) => {
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
                            ? <img src={item.screenshot} alt="" className="w-full h-full object-cover" />
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
                <input type="text" placeholder="Search issues" value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  className="text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 bg-transparent" />
              </div>
            </div>
          </div>

          {!issueList ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
          ) : (() => {
            const filtered = issueList.items
              .filter(i => !issueSearch || i.title.toLowerCase().includes(issueSearch.toLowerCase()))
            const displayed = isBasicPlan ? filtered.slice(0, 8) : filtered
            if (filtered.length === 0) return (
              <p className="text-sm text-gray-400 text-center py-16">No issues found</p>
            )
            return (
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

