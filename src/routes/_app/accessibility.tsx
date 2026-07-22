import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import {
  AlertTriangle, Loader2, CheckCircle2, ClipboardList, Flag,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Search, Code2, Pen, AlignLeft,
} from 'lucide-react'
import AccessibilitySvg from '../../components/svgicons/Accessibility.svg'
import UrlSvg from '../../components/svgicons/url.svg'
import { cn } from '../../lib/utils'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import { useSiteStore } from '../../store/siteStore'
import { IssueDetailPanel } from '../../components/IssueDetailPanel'
import {
  getAccessibilityScore,
  getAccessibilityCommonIssues,
  getAccessibilityWcagSummary,
  getAccessibilityScoreOverTime,
  getAccessibilityAffectedPages,
  getAccessibilityIssueList,
  getAccessibilityIssuesLog,
  getAccessibilityIssuesPerPage,
  getAccessibilityChecklist,
} from '../../api/scans'
import { AccessibilityPageDetail } from '../../components/AccessibilityPageDetail'
import { useIsBasicPlan, LockedOverlay, LimitedListUpgradeFooter, UpgradeButton } from '../../components/UpgradeLock'

export const Route = createFileRoute('/_app/accessibility')({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (typeof s.tab === 'string' ? s.tab : 'Dashboard') as string,
    issueId: typeof s.issueId === 'string' ? s.issueId : undefined,
  }),
  component: AccessibilityPage,
})

const TABS = ['Dashboard', 'Affected pages', 'Issues list', 'Check list']

const PIE_COLORS = ['#8b7cf8', '#3b82f6', '#06b6d4', '#f59e0b', '#10b981']

function splitUrlForDisplay(url: string): { grey: string; bold: string } {
  try {
    const { host, pathname } = new URL(url)
    const parts = pathname.replace(/\/$/, '').split('/').filter(Boolean)
    if (!parts.length) return { grey: host, bold: '' }
    const lastPart = parts.pop()!
    const greyPath = host + (parts.length ? '/' + parts.join('/') + '/' : '/')
    return { grey: greyPath, bold: lastPart }
  } catch {
    return { grey: url, bold: '' }
  }
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
  const isBasicPlan = useIsBasicPlan()
  const { websiteId, strategy, scansByWebsite } = useSiteStore()
  const scanId = websiteId ? scansByWebsite[websiteId]?.scanId ?? null : null
  const { tab: activeTab, issueId: preselectedIssueId } = Route.useSearch()
  const navigate = useNavigate({ from: '/accessibility' })
  const setActiveTab = (tab: string) => navigate({ search: (s) => ({ ...s, tab }), replace: true })
  const [_issueLogCategory, _setIssueLogCategory] = useState<string>('all')
  const [issueListPage, setIssueListPage] = useState(1)
  const [affectedPagesPage, setAffectedPagesPage] = useState(1)
  const [pagesSearch, setPagesSearch] = useState('')
  const [issueSearch, setIssueSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [checklistSearch, setChecklistSearch] = useState('')
  const [pageDetailView, setPageDetailView] = useState<{ scanResultId: string; pageUrl: string } | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  useEffect(() => {
    if (preselectedIssueId) setSelectedIssueId(preselectedIssueId)
  }, [preselectedIssueId])

  const { data: scoreData } = useQuery({
    queryKey: ['accessibility-score', scanId, strategy],
    queryFn: () => getAccessibilityScore(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: commonIssues } = useQuery({
    queryKey: ['accessibility-common', scanId, strategy],
    queryFn: () => getAccessibilityCommonIssues(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: wcagSummary } = useQuery({
    queryKey: ['accessibility-wcag', scanId, strategy],
    queryFn: () => getAccessibilityWcagSummary(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: scoreOverTime } = useQuery({
    queryKey: ['accessibility-over-time', scanId, strategy],
    queryFn: () => getAccessibilityScoreOverTime(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: affectedPages } = useQuery({
    queryKey: ['accessibility-affected-pages', scanId, affectedPagesPage, pagesSearch, strategy],
    queryFn: () => getAccessibilityAffectedPages(scanId!, affectedPagesPage, 20, pagesSearch || undefined, strategy),
    enabled: !!scanId && activeTab === 'Affected pages',
  })

  const { data: issueList, isError: issueListError } = useQuery({
    queryKey: ['accessibility-issue-list', scanId, issueListPage, strategy],
    queryFn: () => getAccessibilityIssueList(scanId!, issueListPage, 20, strategy),
    enabled: !!scanId && activeTab === 'Issues list',
    retry: 1,
  })

  const { data: dashIssues } = useQuery({
    queryKey: ['accessibility-dash-issues', scanId, strategy],
    queryFn: () => getAccessibilityIssuesLog(scanId!, 1, 5, strategy),
    enabled: !!scanId,
  })

  const { data: issuesPerPage } = useQuery({
    queryKey: ['accessibility-issues-per-page', scanId, strategy],
    queryFn: () => getAccessibilityIssuesPerPage(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: checklistData } = useQuery({
    queryKey: ['accessibility-checklist', scanId, strategy],
    queryFn: () => getAccessibilityChecklist(scanId!, strategy),
    enabled: !!scanId && activeTab === 'Check list',
  })

  const score = scoreData?.score ?? 0
  const totalIssues = scoreData?.total_issues ?? 0
  const criticalCount = scoreData?.critical_issues ?? 0
  const prevTotalIssues = scoreData?.previous_total_issues
  const prevCriticalIssues = scoreData?.previous_critical_issues

  const levelA = scoreData?.level_a_score ?? 0
  const levelAA = scoreData?.level_aa_score ?? 0
  const trendPct = scoreData?.score_change ?? null

  const chartData = (scoreOverTime?.data_points ?? []).map((pt, i) => ({
    label: `Scan ${i + 1}`,
    score: pt.score ?? 0,
  }))

  const commonItems = commonIssues?.items ?? []
  const totalCommon = commonIssues?.total_issues ?? totalIssues

  if (!websiteId) return <EmptyState msg="Select a website from the top bar to get started." />
  if (!scanId) return <EmptyState msg="No completed scans yet. Run a scan to see accessibility data." />

  if (pageDetailView) {
    return (
      <AccessibilityPageDetail
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
        <div className="flex items-center justify-between">
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
      </div>

      {/* Dashboard */}
      {activeTab === 'Dashboard' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">

          {/* === HERO CARD === */}
          <div className="bg-white rounded-lg border border-[#9db7f4] p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row items-stretch gap-6">
              {/* Left: text + button */}
              <div className="flex flex-col justify-between lg:w-[30%] min-w-0">
                <div>
                  <h2 className="text-[22px] sm:text-[24px] font-semibold text-[#2e3240] tracking-[-0.48px] leading-[1.58] mb-5">
                    An accessible website reflects positively on your brand image.
                  </h2>
                  <p className="text-[13px] text-[#505050] mb-6">
                    Comply with{' '}
                    <strong className="font-bold">WCAG {wcagSummary?.wcag_version ?? '2.2'}.</strong>{' '}
                    <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noopener noreferrer"
                      className="text-[#0a5dcf] underline">Learn more</a>
                  </p>
                </div>
                <Link to="/accessibility" search={{ tab: 'Issues list', issueId: undefined }}
                  className="inline-flex items-center justify-center bg-[#0b66e4] text-white text-[14px] font-medium rounded-[4px] px-8 py-3.5 self-start">
                  View all issues
                </Link>
              </div>

              {/* Center: score gauge */}
              <div className="flex-1 flex flex-col items-center justify-center py-2">
                <div className="relative overflow-hidden" style={{ width: 220, height: 175 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ value: score }, { value: Math.max(0, 100 - score) }]}
                        cx="50%" cy="52%"
                        startAngle={225} endAngle={-45}
                        innerRadius={68} outerRadius={90}
                        dataKey="value" strokeWidth={0}
                      >
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

              {/* Right: level boxes + stats card */}
              <div className="shrink-0 flex flex-col gap-3 lg:w-[38%]">
                {/* 3 level mini-boxes */}
                <div className="flex gap-3">
                  {/* Level A */}
                  <div className="bg-white border border-[#9cb3e0] rounded-[8px] relative flex-1 min-h-[142px]">
                    <img src={AccessibilitySvg} alt="" className="absolute top-3.5 left-3.5 w-6 h-6" />
                    <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-[rgba(43,28,80,0.7)] tracking-[-0.26px]">Level A</span>
                      <span className="text-[28px] font-semibold text-[#2e3240] leading-none">{levelA}%</span>
                    </div>
                  </div>
                  {/* Level AA */}
                  <div className="bg-white border border-[#9cb3e0] rounded-[8px] relative flex-1 min-h-[142px]">
                    <img src={AccessibilitySvg} alt="" className="absolute top-3.5 left-3.5 w-6 h-6" />
                    <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                      <span className="text-[13px] font-medium text-[rgba(43,28,80,0.7)] tracking-[-0.26px]">Level AA</span>
                      <span className="text-[28px] font-semibold text-[#2e3240] leading-none">{levelAA}%</span>
                    </div>
                  </div>
                  {/* Level AAA — upgrade prompt */}
                  <div className="bg-white border border-[#9cb3e0] rounded-[8px] relative flex-1 min-h-[142px] overflow-hidden">
                    <img src={AccessibilitySvg} alt="" className="absolute top-3.5 left-3.5 w-6 h-6 opacity-50" />
                    <p className="text-[12px] font-medium text-black text-center leading-tight px-2 absolute left-0 right-0 top-[48px]">
                      Want to see Level AAA?
                    </p>
                    <Link to="/upgrade" className="absolute left-[9px] right-[9px] bottom-[44px] bg-[#ff9500] text-[#2e1401] text-[10.5px] font-semibold py-1.5 rounded-[3.5px] text-center">
                      Upgrade Now
                    </Link>
                    <div className="absolute bottom-3 left-4 blur-md pointer-events-none select-none">
                      <div className="text-[13px] font-medium text-[rgba(43,28,80,0.7)]">Level AAA</div>
                      <div className="text-[28px] font-semibold text-[#2b1c50] leading-none">6%</div>
                    </div>
                  </div>
                </div>

                {/* Stats card */}
                <div className="bg-white border border-[#ced6ed] rounded-[8px] p-4 flex items-start gap-2">
                  <div className="flex-1">
                    <div>
                      <div className="text-[14px] font-medium text-[#141414] tracking-[-0.28px] mb-2">Total issues</div>
                      <div className="text-[24px] font-semibold text-[#d93025] tracking-[-0.48px] leading-none">
                        {String(totalIssues).padStart(2, '0')}
                      </div>
                      {prevTotalIssues != null && (
                        <div className="flex items-center gap-1 text-[13px] text-[#73767f] mt-1.5">
                          Previous count : {String(prevTotalIssues).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                    <div className="h-px bg-gray-100 my-3.5" />
                    <div>
                      <div className="text-[14px] font-medium text-[#141414] tracking-[-0.28px] mb-2">Critical issues</div>
                      <div className="text-[24px] font-semibold text-[#d93025] tracking-[-0.48px] leading-none">
                        {String(criticalCount).padStart(2, '0')}
                      </div>
                      {prevCriticalIssues != null && (
                        <div className="flex items-center gap-1 text-[13px] text-[#73767f] mt-1.5">
                          Previous count : {String(prevCriticalIssues).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  </div>
                  <AlertTriangle className="w-7 h-7 text-amber-500 shrink-0 mt-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* === ROW 2: Common issues + WCAG === */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            {/* Common accessibility issues */}
            <div className="flex-1 bg-white rounded-lg border border-[#dfe4f3] p-5 min-w-0">
              <h3 className="text-[20px] font-semibold text-[#2e3240] tracking-[-0.2px] leading-[24px] mb-5">
                Common accessibility issues
              </h3>
              {commonItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-8 text-center">No common issues found</p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* Donut */}
                  <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={commonItems.slice(0, 5).map((item, i) => ({ value: item.elements_affected, fill: PIE_COLORS[i] }))}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={88}
                          dataKey="value" strokeWidth={2} stroke="#fff"
                        >
                          {commonItems.slice(0, 5).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[13px] text-[#73767f]">Total</span>
                      <span className="text-[30px] font-semibold text-[#2e3240]">{totalCommon}</span>
                    </div>
                  </div>
                  {/* Legend table */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 pr-1">
                      <span className="text-[14px] font-semibold text-[#2e3240] ml-5">Issues</span>
                      <span className="text-[14px] font-semibold text-[#2e3240]">Elements affected</span>
                    </div>
                    <div className="divide-y divide-[#f5f5f5]">
                      {commonItems.slice(0, 5).map((item, i) => (
                        <div key={item.rule_id} className="flex items-start justify-between py-2.5 gap-3">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <div className="w-[14px] h-[14px] shrink-0 mt-[3px] rounded-[3px]"
                              style={{ backgroundColor: PIE_COLORS[i] }} />
                            <span className="text-[14px] text-[#2e3240] leading-snug tracking-[-0.28px] line-clamp-2">{item.title}</span>
                          </div>
                          <span className="text-[14px] text-[#2e3240] shrink-0 min-w-[28px] text-right">{item.elements_affected}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WCAG card */}
            <div className="w-full lg:w-[471px] shrink-0 bg-white rounded-lg border border-[#dfe4f3] p-5">
              <h3 className="text-[20px] font-semibold text-[#2e3240] tracking-[-0.2px] leading-[24px] mb-5">
                WCAG {wcagSummary?.wcag_version ?? '2.2'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Passed Audits */}
                <div className="border border-[#dedede] rounded-[8px] p-4 relative" style={{ minHeight: 144 }}>
                  <CheckCircle2 className="w-[30px] h-[30px] text-green-500 absolute top-3.5 right-3.5" />
                  <div className="mt-10">
                    <div className="flex items-center gap-1 text-[14px] text-[#73767f]">
                      Passed Audits
                    </div>
                    <div className="text-[24px] font-medium text-black mt-2">{wcagSummary?.passed_audits ?? 0}</div>
                  </div>
                </div>
                {/* Required manual checks */}
                <div className="border border-[#dedede] rounded-[8px] p-4 relative" style={{ minHeight: 144 }}>
                  <ClipboardList className="w-[28px] h-[28px] text-blue-500 absolute top-3.5 right-3.5" />
                  <div className="mt-10">
                    <div className="text-[14px] text-[#73767f] leading-snug pr-2">
                      Required manual checks
                    </div>
                    <div className="text-[24px] font-medium text-black mt-2">{wcagSummary?.needs_review_count ?? 0}</div>
                  </div>
                </div>
                {/* Not Applicable */}
                <div className="border border-[#dedede] rounded-[8px] p-4 relative" style={{ minHeight: 144 }}>
                  <Flag className="w-[28px] h-[28px] text-red-400 absolute top-3.5 right-3.5" />
                  <div className="mt-10">
                    <div className="flex items-center gap-1 text-[14px] text-[#73767f]">
                      Not Applicable
                    </div>
                    <div className="text-[24px] font-medium text-black mt-2">{wcagSummary?.not_applicable_count ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* === ROW 3: Accessibility over time + Issues per page === */}
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5">
            {/* Accessibility over time */}
            <div className="flex-1 bg-white rounded-lg border border-[#dfe4f3] p-5 min-w-0">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Accessibility over time</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <button className="border border-[#0b66e4] rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[#0b66e4] bg-white">Overall score</button>
                  <button className="border border-[#e0e2e7] rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[#1a1a1a]">Level A</button>
                  <div className="w-px h-5 bg-[#e0e2e7] mx-1" />
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Today</button>
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Yesterday</button>
                  <button className="border border-[#e0e2e7] rounded-[24px] px-3 py-1.5 text-[10px] text-[#242424]">Last week</button>
                </div>
              </div>
              <div className="relative">
                {isBasicPlan && <LockedOverlay label="Upgrade to see accessibility trends over time" />}
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0b66e4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0b66e4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                      formatter={(v) => [`${Number(v)}%`, 'Accessibility']} />
                    <Area type="monotone" dataKey="score" stroke="#0b66e4" strokeWidth={2}
                      fill="url(#areaGrad)" dot={{ fill: '#06387d', r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Issues per page */}
            {issuesPerPage && issuesPerPage.items.length > 0 && (
              <div className="w-full lg:w-[476px] shrink-0 bg-white rounded-lg border border-[#dfe4f3] p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Issues per page</h3>
                  <Link to="/accessibility" search={{ tab: 'Issues list', issueId: undefined }}
                    className="text-[14px] font-medium text-[#0b66e4] whitespace-nowrap">
                    View all issues →
                  </Link>
                </div>
                <div className="space-y-3 mb-4">
                  {issuesPerPage.items.slice(0, 5).map((item, i) => {
                    const max = Math.max(...issuesPerPage.items.map((x) => x.issue_count), 1)
                    const pct = Math.round((item.issue_count / max) * 100)
                    const { grey, bold } = splitUrlForDisplay(item.page_url)
                    return (
                      <div key={i}>
                        <div className="text-[12px] font-medium mb-1.5">
                          <span className="text-[#9fa1a7]">{grey}</span>
                          <span className="text-[#2e3240]">{bold}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded overflow-hidden" style={{ height: '10px' }}>
                            <div className="h-full bg-[#8590a2] rounded transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[13px] font-semibold text-[#2e3240] w-8 text-right shrink-0">{item.issue_count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between pr-11">
                  {[0, Math.round(issuesPerPage.items[0]?.issue_count * 0.33), Math.round(issuesPerPage.items[0]?.issue_count * 0.66), issuesPerPage.items[0]?.issue_count].map((v, i) => (
                    <span key={i} className="text-[12px] text-[#9fa1a7]">{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* === ISSUES LOG === */}
          <div className="bg-white rounded-lg border border-[#dfe4f3] p-6">
            <div className="mb-5">
              <h3 className="text-[18px] font-semibold text-[#2e3240] tracking-[-0.36px]">Issues log</h3>
              <p className="text-[12px] text-[#73767f] mt-1 tracking-[-0.24px]">
                Optimize your website for peak performance by resolving these issues
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
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 rounded-l-[10px]">Name</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-44">Page URL</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-28">Level</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-28">Priority</th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 w-28 rounded-r-[10px]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashIssues.items.slice(0, 8).map((item, idx) => {
                        const priority = item.priority ?? ''
                        const rawLevel = item.conformance_level ?? item.wcag_level ?? 'AA'
                        const level = rawLevel.startsWith('Level ') ? rawLevel : `Level ${rawLevel}`
                        return (
                          <tr key={item.issue_id} className={cn('border-t border-[#eaebec] transition-colors', isBasicPlan && idx >= 5 ? 'blur-sm select-none pointer-events-none' : 'hover:bg-gray-50/60')}>
                            <td className="px-4 py-[18px] text-[14px] text-[#252833] tracking-[-0.14px] leading-snug">{item.title}</td>
                            <td className="px-4 py-[18px]">
                              {item.page_url ? (
                                <a href={item.page_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[14px] text-[#0a5dcf] underline truncate block max-w-[160px]">
                                  {item.page_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                </a>
                              ) : <span className="text-[14px] text-[#9fa1a7]">—</span>}
                            </td>
                            <td className="px-4 py-[18px] text-[14px] text-[#252833] tracking-[-0.14px]">{level}</td>
                            <td className="px-4 py-[18px]">
                              <PriorityBadge priority={priority} />
                            </td>
                            <td className="px-4 py-[18px]">
                              <Link to="/accessibility" search={{ tab: 'Issues list', issueId: undefined }} className="text-[14px] font-medium text-[#0a5dcf] underline">View more</Link>
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

      {/* Affected pages */}
      {activeTab === 'Affected pages' && (
        <div className="flex-1 p-3 sm:p-6 space-y-4">

          {/* Top: most-affected page cards */}
          <div className="bg-white rounded-[8px] border border-[#9db7f4] p-5 sm:p-6">
            <h3 className="text-[20px] font-semibold text-[#2e3240] tracking-[-0.4px] leading-[42px]">
              Accessibility issues per page
            </h3>
            <p className="text-[15px] font-medium text-[#73767f] tracking-[-0.3px] mb-6">
              Pages with most issues
            </p>
            {!affectedPages ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No page data</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 -mb-1">
                {affectedPages.items.slice(0, 8).map((item, i) => {
                  const s = item.page_score ?? 0
                  const barColor = s < 50 ? '#d12929' : s < 80 ? '#e08632' : '#219653'
                  const name = pageName(item.page_url)
                  return (
                    <div key={i} className="shrink-0 relative" style={{ width: 224, height: 295 }}>
                      {/* Purple shadow card (offset behind) */}
                      <div className="absolute bg-[#eceefb] border border-[#dadada] rounded-[6.4px]"
                        style={{ top: 3, left: 1, width: 224, height: 257 }} />
                      {/* Main white card */}
                      <button
                        onClick={() => item.scan_result_id && item.total_issues > 0 && setPageDetailView({ scanResultId: item.scan_result_id, pageUrl: item.page_url })}
                        className="absolute inset-0 bg-white border border-[#dadada] rounded-[6.4px] overflow-hidden flex flex-col text-left hover:shadow-md transition-shadow cursor-pointer"
                        style={{ height: 288 }}
                        disabled={!item.scan_result_id || item.total_issues === 0}
                      >
                        {/* Screenshot */}
                        <div className="shrink-0 overflow-hidden rounded-t-[6.4px]" style={{ height: 125 }}>
                          {item.screenshot ? (
                            <img src={item.screenshot} alt={name} className="w-full h-full object-cover object-top" />
                          ) : (
                            <div className="w-full h-full bg-[#eceefb]" />
                          )}
                        </div>
                        {/* Gradient fade below image */}
                        <div className="shrink-0" style={{ height: 14, background: 'linear-gradient(to bottom, rgba(180,180,180,0.25), transparent)' }} />
                        {/* Separator line */}
                        <div className="shrink-0 border-t border-gray-200" />

                        {/* Title + external link */}
                        <div className="px-4 pt-3 flex items-start justify-between gap-2 shrink-0">
                          <p className="text-[14px] font-medium text-[#2e3240] leading-[1.4] tracking-[-0.28px] line-clamp-2">
                            {name}
                          </p>
                          <a href={item.page_url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="shrink-0 mt-0.5">
                            <img src={UrlSvg} alt="" className="w-[18px] h-[18px]" />
                          </a>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Issue counts */}
                        <div className="px-4 pb-5 flex justify-between">
                          <div>
                            <div className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.44px] leading-none">{item.total_issues}</div>
                            <div className="text-[13px] text-[#2e3240] tracking-[-0.26px] mt-0.5">Total issues</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.44px] leading-none">{item.critical_issues}</div>
                            <div className="text-[13px] text-[#2e3240] tracking-[-0.26px] mt-0.5">Critical issues</div>
                          </div>
                        </div>

                        {/* Colored severity bar */}
                        <div className="shrink-0 rounded-b-[6.4px]" style={{ height: 7, backgroundColor: barColor }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bottom: Pages list table */}
          <div className="bg-white rounded-[8px] border border-[#9db7f4] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 gap-4 flex-wrap">
              <h3 className="text-[18px] font-semibold text-[#252833] tracking-[-0.36px] whitespace-nowrap">
                Pages list
              </h3>
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative flex items-center border border-[rgba(159,159,159,0.92)] rounded-[4px] h-[43px]" style={{ width: 313 }}>
                  <input
                    type="text"
                    placeholder="Search by pages"
                    value={pagesSearch}
                    onChange={(e) => { setPagesSearch(e.target.value); setAffectedPagesPage(1) }}
                    className="flex-1 px-4 text-[14px] text-[#242424] placeholder-[#24242499] outline-none bg-transparent"
                  />
                  <Search className="w-6 h-6 text-gray-400 mr-3 shrink-0" />
                </div>
              </div>
            </div>

            {!affectedPages ? (
              <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : affectedPages.items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-12">No affected pages found</p>
            ) : (
              <>
                <div className="overflow-x-auto px-6">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 bg-[#f2f3f8] rounded-l-[8px]">
                          Pages
                        </th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 bg-[#f2f3f8] w-24">
                          Score
                        </th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 bg-[#f2f3f8] w-36">
                          Critical issues
                        </th>
                        <th className="text-left text-[13px] font-medium text-[#2e3240] tracking-[-0.13px] px-4 py-3 bg-[#f2f3f8] rounded-r-[8px] w-28">
                          Total issues
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isBasicPlan ? affectedPages.items.slice(0, 8) : affectedPages.items).map((item, i) => {
                        const s = item.page_score ?? 0
                        const shortUrl = item.page_url.replace(/^https?:\/\//, '')
                        const locked = isBasicPlan && i >= 5
                        return (
                          <tr key={i}
                            onClick={() => !locked && item.scan_result_id && item.total_issues > 0 && setPageDetailView({ scanResultId: item.scan_result_id, pageUrl: item.page_url })}
                            className={cn('border-b border-[#ebebeb] transition-colors', locked ? 'blur-sm select-none pointer-events-none' : 'hover:bg-gray-50/60', item.scan_result_id && item.total_issues > 0 && 'cursor-pointer')}>
                            <td className="px-4 py-[18px]">
                              <div className="text-[14px] font-medium text-[#2e3240] tracking-[-0.14px] leading-[1.4]">
                                {pageName(item.page_url)}
                              </div>
                              <div className="text-[12px] text-[#73767f] mt-0.5">
                                <span>URL : </span>
                                <a href={item.page_url} target="_blank" rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="underline hover:text-blue-600">
                                  {shortUrl}
                                </a>
                              </div>
                            </td>
                            <td className="px-4 py-[18px]">
                              <span className="text-[13px] font-medium text-[#2e3240]">{s}%</span>
                            </td>
                            <td className="px-4 py-[18px]">
                              <span className="text-[13px] font-medium text-[#2e3240]">{item.critical_issues}</span>
                            </td>
                            <td className="px-4 py-[18px]">
                              <span className="text-[13px] font-medium text-[#2e3240]">{item.total_issues}</span>
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
                  <div className="px-6 pb-6">
                    <IssuesLogPagination
                      page={affectedPagesPage}
                      total={affectedPages.total}
                      pageSize={20}
                      onPage={setAffectedPagesPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Issues list tab */}
      {activeTab === 'Issues list' && (
        <div className="flex-1 p-3 sm:p-6">
          {/* Title */}
          <h2 className="text-[20px] font-bold text-[#1a1a2e] tracking-[-0.4px] mb-5">All issues</h2>


          {/* Responsibility cards */}
          {issueList && (() => {
            const devCount = issueList.items.filter(i => i.responsibility?.toLowerCase() === 'development').length
            const designCount = issueList.items.filter(i => i.responsibility?.toLowerCase() === 'design').length
            const contentCount = issueList.items.filter(i => i.responsibility?.toLowerCase() === 'content').length
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                  { key: 'development', label: 'Development', count: devCount, textCls: 'text-[#16a34a]', bgCls: 'bg-[#f0fdf4]', borderCls: 'border-[#bbf7d0]', icon: <Code2 className="w-5 h-5" /> },
                  { key: 'design', label: 'Design', count: designCount, textCls: 'text-[#7c3aed]', bgCls: 'bg-[#faf5ff]', borderCls: 'border-[#e9d5ff]', icon: <Pen className="w-5 h-5" /> },
                  { key: 'content', label: 'Content', count: contentCount, textCls: 'text-[#0891b2]', bgCls: 'bg-[#ecfeff]', borderCls: 'border-[#a5f3fc]', icon: <AlignLeft className="w-5 h-5" /> },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setCatFilter(catFilter === cat.key ? null : cat.key)}
                    className={cn(
                      'flex items-center gap-3 p-4 bg-white rounded-[10px] border text-left transition-all',
                      catFilter === cat.key ? 'border-[#9db7f4] shadow-sm' : 'border-[#e8eaf0] hover:border-[#c0c8dc]'
                    )}
                  >
                    <div className={cn('w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 border', cat.bgCls, cat.textCls, cat.borderCls)}>
                      {cat.icon}
                    </div>
                    <div>
                      <div className={cn('text-sm font-semibold', cat.textCls)}>{cat.label}</div>
                      <div className="text-[13px] text-[#6b7280]">{cat.count} issue{cat.count === 1 ? '' : 's'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )
          })()}

          {/* Search + premium filters */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                value={issueSearch}
                onChange={(e) => setIssueSearch(e.target.value)}
                placeholder="Search issues"
                className="pl-9 pr-3 py-2 text-sm border border-[#e0e3eb] rounded-[6px] w-52 focus:outline-none focus:border-[#0b66e4] bg-white placeholder:text-[#9ca3af]"
              />
            </div>
          </div>

          {/* Issues table */}
          {issueListError ? (
            <p className="text-sm text-red-400 text-center py-12">Failed to load issues.</p>
          ) : !issueList ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
          ) : (() => {
            const filtered = issueList.items.filter((item) => {
              if (issueSearch && !item.title.toLowerCase().includes(issueSearch.toLowerCase())) return false
              if (catFilter && item.responsibility?.toLowerCase() !== catFilter) return false
              return true
            })
            const displayed = isBasicPlan ? filtered.slice(0, 8) : filtered
            return (
              <div className="bg-white rounded-[10px] border border-[#e8eaf0] overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-[#f2f4f8] border-b border-[#e8eaf0]">
                      <th className="text-left text-xs font-semibold text-[#6b7280] px-5 py-3">Issues</th>
                      <th className="text-left text-xs font-semibold text-[#6b7280] px-4 py-3 w-28">Pages<br/>affected</th>
                      <th className="text-left text-xs font-semibold text-[#6b7280] px-4 py-3 w-32">
                        Priority
                      </th>
                      <th className="text-left text-xs font-semibold text-[#6b7280] px-4 py-3 w-40">Category</th>
                      <th className="text-left text-xs font-semibold text-[#6b7280] px-4 py-3 w-32">Conformance<br/>level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.length === 0 ? (
                      <tr><td colSpan={5} className="py-14 text-center text-sm text-[#9ca3af]">No issues found.</td></tr>
                    ) : displayed.map((item, idx) => {
                      const priority = item.priority ?? 'low'
                      const resp = item.responsibility?.toLowerCase()
                      const locked = isBasicPlan && idx >= 5
                      return (
                        <tr key={item.id} onClick={() => !locked && setSelectedIssueId(item.id)} className={cn('border-t border-[#f0f1f5] transition-colors', locked ? 'blur-sm select-none pointer-events-none' : 'hover:bg-[#fafbfd] cursor-pointer')}>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-sm text-[#0b66e4] font-medium leading-snug">{item.title}</span>
                              {item.wcag_version && (
                                <span className="text-xs text-[#9ca3af] whitespace-nowrap">
                                  WCAG {item.wcag_version}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#374151]">{item.pages_affected}</td>
                          <td className="px-4 py-4">
                            <PriorityBadge priority={priority} />
                          </td>
                          <td className="px-4 py-4">
                            {resp === 'development' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                                <Code2 className="w-3.5 h-3.5" /> Development
                              </span>
                            ) : resp === 'design' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[#faf5ff] text-[#7c3aed] border border-[#e9d5ff]">
                                <Pen className="w-3.5 h-3.5" /> Design
                              </span>
                            ) : resp === 'content' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium bg-[#ecfeff] text-[#0891b2] border border-[#a5f3fc]">
                                <AlignLeft className="w-3.5 h-3.5" /> Content
                              </span>
                            ) : (
                              <span className="text-sm text-[#9ca3af]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#374151]">
                            {item.conformance_level ?? item.wcag_level ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {isBasicPlan ? (
                  <LimitedListUpgradeFooter totalCount={issueList.total} shown={5} />
                ) : (
                  <div className="px-5 py-3 border-t border-[#f0f1f5]">
                    <IssuesLogPagination page={issueListPage} total={issueList.total} pageSize={20} onPage={setIssueListPage} />
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Check list tab */}
      {activeTab === 'Check list' && (
        <div className="flex-1 p-3 sm:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-[20px] font-bold text-[#1a1a2e] tracking-[-0.4px]">
              Accessibility checklist{checklistData?.wcag_version ? ` (WCAG ${checklistData.wcag_version})` : ''}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button className="flex items-center gap-1.5 h-9 px-3 border border-[#e0e3eb] rounded-[6px] bg-white text-[13px] text-[#374151] hover:bg-gray-50 transition-colors">
                Filter by
                <ChevronDown className="w-4 h-4 text-[#9ca3af]" />
              </button>
              <div className="relative flex items-center border border-[#e0e3eb] rounded-[6px] h-9 w-56">
                <Search className="absolute left-3 w-4 h-4 text-[#9ca3af]" />
                <input
                  type="text"
                  placeholder="Search by title, URL"
                  value={checklistSearch}
                  onChange={e => setChecklistSearch(e.target.value)}
                  className="pl-9 pr-3 text-[13px] text-[#374151] placeholder-[#9ca3af] outline-none bg-transparent w-full"
                />
              </div>
            </div>
          </div>

          {!checklistData ? (
            <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
          ) : !checklistData.principles || checklistData.principles.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No checklist data available</p>
          ) : (
            <div className="space-y-8">
              {isBasicPlan && (
                <div className="rounded-[8px] border border-[#e0e3eb] bg-[#f9fafb] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[13px] text-[#2e3240]">Your free plan only includes checklist item 1.1.1. Upgrade to see the full WCAG checklist.</p>
                  <UpgradeButton />
                </div>
              )}
              {checklistData.principles.map((principle) => {
                const principleGuidelines = (principle.guidelines ?? [])
                  .filter(g =>
                    !checklistSearch || g.title.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                    (g.items ?? []).some(c => c.description.toLowerCase().includes(checklistSearch.toLowerCase()) || c.criterion.toLowerCase().includes(checklistSearch.toLowerCase()))
                  )
                  .filter(g => !isBasicPlan || (g.items ?? []).some(c => c.criterion === '1.1.1'))
                if (principleGuidelines.length === 0) return null
                return (
                  <div key={principle.number}>
                    {/* Principle heading — standalone, no card wrapper */}
                    <h3 className="text-[16px] font-bold text-[#141414] tracking-[-0.32px] mb-3">
                      Principle {principle.number}: {principle.title}
                    </h3>
                    {/* Guideline accordions — separate bordered cards */}
                    <div className="space-y-2">
                      {principleGuidelines.map((guideline) => (
                        <ChecklistGuideline
                          key={guideline.guideline}
                          guideline={guideline}
                          search={checklistSearch}
                          basicLocked={isBasicPlan}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedIssueId && (
        <IssueDetailPanel issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} variant="accessibility" />
      )}
    </div>
  )
}


function outcomeStyle(outcome: string): { bg: string; color: string; label: string } {
  const o = outcome?.toLowerCase().replace(/\s/g, '_')
  if (o === 'passed') return { bg: '#ebfff2', color: '#1e894c', label: 'Passed' }
  if (o === 'failed') return { bg: '#fff1f1', color: '#e72e2e', label: 'Failed' }
  if (o === 'not_applicable') return { bg: '#f1f1f1', color: '#3b3b3b', label: 'Not applicable' }
  return { bg: '#ffeddf', color: '#ff5e00', label: 'Manual check' }
}

function ChecklistGuideline({ guideline, search, basicLocked }: {
  guideline: import('../../types').ChecklistGuidelineItem
  search: string
  basicLocked?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filteredCriteria = (guideline.items ?? [])
    .filter(c =>
      !search ||
      c.criterion.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    )
    .filter(c => !basicLocked || c.criterion === '1.1.1')
  if (filteredCriteria.length === 0) return null
  return (
    <div className="border border-[#ebebeb] rounded-[8px] overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-0 h-[55px] text-left bg-white hover:bg-gray-50/40 transition-colors"
      >
        <span className="text-[14px] font-medium text-[#141414] tracking-[-0.28px]">
          {guideline.guideline} {guideline.title}
        </span>
        {open
          ? <ChevronUp className="w-[26px] h-[26px] text-[#2e3240] shrink-0" />
          : <ChevronDown className="w-[26px] h-[26px] text-[#2e3240] shrink-0" />}
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-[#ebebeb]">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-[#f2f3f8]">
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-5 py-3 w-28">Guidelines</th>
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-4 py-3 w-40">Guidelines description</th>
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-4 py-3 w-20">Level</th>
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-4 py-3">Instruction</th>
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-4 py-3 w-32">Page effected</th>
                <th className="text-left text-[12px] font-medium text-[#2b1c50] tracking-[-0.12px] px-4 py-3 w-36">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filteredCriteria.map((criterion, idx) => {
                const { bg, color, label } = outcomeStyle(criterion.outcome)
                return (
                  <tr key={idx} className="border-t border-[#eaebec]">
                    <td className="px-5 py-3.5 text-[13px] text-[#242424] tracking-[-0.13px] whitespace-nowrap">{criterion.criterion}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#242424] tracking-[-0.13px] leading-snug">{criterion.description}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#242424] tracking-[-0.13px]">{criterion.level}</td>
                    <td className="px-4 py-3.5 text-[13px] text-[#242424] tracking-[-0.13px] leading-[1.4]">
                      {criterion.instruction ?? <span className="text-[#9ca3af]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] text-[#242424] tracking-[-0.13px]">
                      {criterion.pages_affected}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-[4px] text-[12px] font-medium whitespace-nowrap"
                        style={{ backgroundColor: bg, color }}>
                        {label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

