import { createFileRoute, Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Label,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  Globe,
  LayoutGrid,
  Plus,
  Loader2,
  X,
  Search,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { PriorityBadge } from '../../components/ui/PriorityBadge'
import { AccessibilityIcon, PerformanceIcon, QualityIcon, SeoIcon } from '../../components/ui/CategoryIcons'
import { useSiteStore } from '../../store/siteStore'
import { listWebsites, createWebsite } from '../../api/websites'
import { getScanDashboard, getScanIssues, getScanPages, getPageScores } from '../../api/scans'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog'
import type { DashboardScores, IssueCategory } from '../../types'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

const CATEGORIES = [
  { key: 'accessibility' as IssueCategory, label: 'Accessibility', Icon: AccessibilityIcon, route: '/accessibility' },
  { key: 'performance' as IssueCategory, label: 'Performance', Icon: PerformanceIcon, route: '/performance' },
  { key: 'best_practices' as IssueCategory, label: 'Quality', Icon: QualityIcon, route: '/quality' },
  { key: 'seo' as IssueCategory, label: 'SEO', Icon: SeoIcon, route: '/seo' },
]

const TABS: { key: IssueCategory | 'all'; label: string; Icon: React.ElementType }[] = [
  { key: 'all', label: 'All', Icon: LayoutGrid },
  { key: 'accessibility', label: 'Accessibility', Icon: AccessibilityIcon },
  { key: 'performance', label: 'Performance', Icon: PerformanceIcon },
  { key: 'best_practices', label: 'Quality', Icon: QualityIcon },
  { key: 'seo', label: 'SEO', Icon: SeoIcon },
]

const PIE_COLORS: Record<IssueCategory, string> = {
  performance: '#c5d0e8',
  accessibility: '#1a2f5e',
  best_practices: '#4dcfca',
  quality: '#4dcfca',
  seo: '#7b8fd4',
}

function categoryIcon(cat: string) {
  const key = cat === 'quality' ? 'best_practices' : cat
  const found = CATEGORIES.find((c) => c.key === key)
  if (!found) return null
  const Icon = found.Icon
  return <Icon className="w-5 h-5 text-gray-900" />
}

function formatPageUrl(url: string) {
  try {
    const u = new URL(url)
    return { host: u.hostname, path: u.pathname === '/' ? '' : u.pathname }
  } catch {
    return { host: url, path: '' }
  }
}

function ScannedPagesModal({ scanJobId, onClose }: { scanJobId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'all' | 'included' | 'excluded'>('all')
  const [search, setSearch] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  const { data: pages = [] } = useQuery({
    queryKey: ['page-scores', scanJobId],
    queryFn: () => getPageScores(scanJobId),
  })

  const urls = pages.map((p) => p.page_url)
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return urls.filter((u) => !q || u.toLowerCase().includes(q))
  }, [urls, search])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Scanned pages</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          {(['all', 'included', 'excluded'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'all' ? 'All' : t === 'included' ? 'Included URLs' : 'Excluded URLs'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-sm border border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by URL's"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* Table header */}
        <div className="px-6 py-2 bg-gray-50 border-y border-gray-100 shrink-0">
          <span className="text-xs font-semibold text-gray-500">Page URL</span>
        </div>

        {/* URL list */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">No pages found</div>
          ) : (
            filtered.map((url) => (
              <div key={url} className="px-6 py-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block"
                  title={url}
                >
                  {url.length > 55 ? url.slice(0, 55) + '…' : url}
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


function DashboardPage() {
  const { websiteId, setWebsiteId, strategy, scansByWebsite } = useSiteStore()
  const scanInfo = websiteId ? scansByWebsite[websiteId] : undefined
  const scanId = scanInfo?.scanId ?? null
  const prevScanId = scanInfo?.prevScanId ?? null
  const [activeTab, setActiveTab] = useState<IssueCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const { data: websites = [], refetch: refetchWebsites } = useQuery({
    queryKey: ['websites'],
    queryFn: listWebsites,
    staleTime: Infinity,
  })

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', scanId, strategy],
    queryFn: () => getScanDashboard(scanId!, strategy),
    enabled: !!scanId,
  })

  const { data: prevDashboard } = useQuery({
    queryKey: ['dashboard', prevScanId, strategy],
    queryFn: () => getScanDashboard(prevScanId!, strategy),
    enabled: !!prevScanId,
  })

  // 'best_practices' tab maps to 'quality' on the backend
  const categoryParam = activeTab === 'all' ? undefined : activeTab === 'best_practices' ? 'quality' : activeTab

  const { data: scanIssues } = useQuery({
    queryKey: ['scan-issues', scanId, strategy, currentPage, itemsPerPage, activeTab],
    queryFn: () => getScanIssues(scanId!, currentPage, itemsPerPage, categoryParam, strategy),
    enabled: !!scanId,
    placeholderData: (prev) => prev,
  })

  const { data: scanPages, isLoading: scanPagesLoading } = useQuery({
    queryKey: ['scan-pages', scanId, strategy],
    queryFn: () => getScanPages(scanId!, strategy),
    enabled: !!scanId,
  })

  const selectedWebsite = websites.find((w) => w.id === websiteId)

  const pagedIssues = scanIssues?.items ?? []
  const totalPages = scanIssues?.total_pages ?? 1

  function buildPageNums(current: number, total: number): (number | '...')[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: (number | '...')[] = [1, 2]
    if (current > 4) pages.push('...')
    for (let p = Math.max(3, current - 1); p <= Math.min(total - 2, current + 1); p++) {
      if (!pages.includes(p)) pages.push(p)
    }
    if (current < total - 3) pages.push('...')
    if (!pages.includes(total - 1)) pages.push(total - 1)
    if (!pages.includes(total)) pages.push(total)
    return pages
  }
  const pageNums = buildPageNums(currentPage, totalPages)

  // Issue counts from dashboard API
  const issueCounts = useMemo(() => {
    if (!dashboard) return { total: 0, critical: 0, accessibility: 0, performance: 0, best_practices: 0, seo: 0 }
    return {
      total: dashboard.issues_summary.total,
      critical: dashboard.issues_summary.critical,
      accessibility: dashboard.issues_by_category.accessibility,
      performance: dashboard.issues_by_category.performance,
      best_practices: dashboard.issues_by_category.quality,
      seo: dashboard.issues_by_category.seo,
    }
  }, [dashboard])

  const pieData = useMemo(() => {
    if (!dashboard) return []
    return [
      { name: 'Accessibility', value: dashboard.issues_by_category.accessibility, color: PIE_COLORS.accessibility },
      { name: 'Performance', value: dashboard.issues_by_category.performance, color: PIE_COLORS.performance },
      { name: 'Quality', value: dashboard.issues_by_category.quality, color: PIE_COLORS.best_practices },
      { name: 'SEO', value: dashboard.issues_by_category.seo, color: PIE_COLORS.seo },
    ].filter((d) => d.value > 0)
  }, [dashboard])

  const issuesPerPage = useMemo(() => {
    if (!scanPages?.items?.length) return []
    return [...scanPages.items]
      .sort((a, b) => b.total_issues - a.total_issues)
      .slice(0, 5)
      .map((p) => ({ url: p.url, count: p.total_issues }))
  }, [scanPages])

  const maxIssueCount = Math.max(...issuesPerPage.map((p) => p.count), 1)

  useEffect(() => { setCurrentPage(1) }, [activeTab, itemsPerPage])

  async function handleAddWebsite(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const w = await createWebsite(newName, newUrl)
      await refetchWebsites()
      setWebsiteId(w.id)
      setAddOpen(false)
      setNewName('')
      setNewUrl('')
      toast.success('Website added!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Could not add website')
    } finally {
      setAdding(false)
    }
  }

  // ── No websites yet ────────────────────────────────────────────────
  if (websites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-sm flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">No websites yet</h3>
        <p className="text-sm text-gray-500 mb-5">Add your first website to start auditing</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Website
        </button>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Website</DialogTitle>
              <DialogDescription>Enter the details of the website you want to audit.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWebsite} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" placeholder="My Website" value={newName} onChange={(e) => setNewName(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input type="url" placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setAddOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-sm hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={adding}
                  className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-sm hover:bg-blue-700 disabled:opacity-50">
                  {adding ? 'Adding…' : 'Add Website'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ── No scan yet for selected website ──────────────────────────────
  if (!scanId) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Site health overview</h1>
        <p className="text-sm text-gray-400 mb-8">
          No completed scans yet for{' '}
          <span className="font-medium text-gray-600">{selectedWebsite?.name}</span>. Use{' '}
          <span className="font-semibold text-blue-600">Run scan</span> in the top bar to start.
        </p>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const scanDateTime = dashboard?.scanned_at
    ? new Date(dashboard.scanned_at).toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null

  return (
    <>
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      {/* ── Site health overview ─────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-[#9db7f4] shadow-sm p-4 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#1c1e26] tracking-tight mb-1.5">Site health overview</h1>
            <div className="flex items-center gap-1.5 text-sm">
              <a
                href={selectedWebsite?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                {selectedWebsite?.url?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          </div>

          {scanDateTime && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{scanDateTime}</span>
              </div>
            </div>
          )}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map(({ key, label, Icon, route }) => {
            const dashKey = (key === 'best_practices' ? 'quality' : key) as keyof DashboardScores
            const score = dashboard.scores[dashKey] != null ? Math.round(dashboard.scores[dashKey]!) : null
            const prevScore = prevDashboard?.scores?.[dashKey] != null ? Math.round(prevDashboard.scores[dashKey]!) : null
            const trend = score != null && prevScore != null ? score - prevScore : null
            const count = issueCounts[key as keyof typeof issueCounts] as number

            return (
              <Link key={key} to={route} className="block border border-[#9cb0e0] rounded-lg p-5 hover:shadow-sm transition-all cursor-pointer">
                {/* Icon */}
                <div className="w-10 h-10 rounded-[7px] bg-[#f0f5ff] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-500" />
                </div>

                <div className="text-[15px] text-[#404041] mb-2 font-medium">{label}</div>

                {/* Score + trend */}
                <div className="flex items-baseline gap-3 mb-4">
                  {score != null ? (
                    <span className={cn('font-semibold leading-none', score < 50 ? 'text-[#d93025]' : 'text-[#2e3240]')}>
                      <span className="text-[34px]">{score}</span><span className="text-2xl">%</span>
                    </span>
                  ) : (
                    <span className="text-3xl font-bold text-gray-300">—</span>
                  )}
                  {trend != null && (
                    <span className={cn('flex items-center text-sm font-semibold', trend >= 0 ? 'text-[#0a843f]' : 'text-[#d93025]')}>
                      {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
                    </span>
                  )}
                </div>

                {/* Total issues */}
                <div className="flex items-center gap-1 text-sm text-[#404041] font-medium">
                  <span>Total issues : <span className={count > 0 ? 'text-[#d93025]' : ''}>{count}</span></span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">

        {/* Left column */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 sm:gap-5">

          {/* Card 1: Overall issues */}
          <div className="bg-white rounded-lg border border-[#dfe4f3] shadow-sm p-4 sm:p-5">
            <div className="flex border border-[#d1d9ea] rounded-[4px] overflow-hidden">
              <div className="flex-1 p-4">
                <div className="flex items-center gap-1 text-[13px] text-[rgba(64,64,65,0.8)] mb-2">
                  Total issues
                </div>
                <div className="text-2xl font-semibold text-[#404041] tracking-tight">{issueCounts.total}</div>
              </div>
              <div className="w-px bg-[#d1d9ea] shrink-0 my-3" />
              <div className="flex-1 p-4">
                <div className="flex items-center gap-1 text-[13px] text-[rgba(64,64,65,0.8)] mb-2">
                  Critical issues
                </div>
                <div className="text-2xl font-semibold text-[#404041] tracking-tight">{issueCounts.critical}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Total issues donut */}
          <div className="bg-white rounded-lg border border-[#dfe4f3] shadow-sm p-4 sm:p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Total issues</h2>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                      <Label
                        content={({ viewBox }) => {
                          const vb = viewBox as { cx: number; cy: number }
                          return (
                            <g>
                              <text x={vb.cx} y={vb.cy - 7} textAnchor="middle" fill="#9ca3af" fontSize={11}>Total Issue</text>
                              <text x={vb.cx} y={vb.cy + 16} textAnchor="middle" fill="#111827" fontSize={24} fontWeight="bold">{issueCounts.total}</text>
                            </g>
                          )
                        }}
                      />
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend — 2-column grid with diamond icons */}
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 shrink-0 rotate-45" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-gray-600">{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-400 text-center py-8">No issues found</div>
            )}
          </div>

          {/* Issues per page */}
          <div className="bg-white rounded-lg border border-[#dfe4f3] shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[#2e3240] tracking-tight">Issues per page</h2>
              {scanId && (
                <Link
                  to="/scans/$scanId/issues"
                  params={{ scanId: scanId }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  View all issues <span className="ml-0.5">→</span>
                </Link>
              )}
            </div>

            {scanPagesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-blue-400" /></div>
            ) : issuesPerPage.length > 0 ? (
              <div className="space-y-3.5">
                {issuesPerPage.map(({ url, count }) => {
                  const { host, path } = formatPageUrl(url)
                  const pct = (count / maxIssueCount) * 100
                  return (
                    <div key={url}>
                      <p className="text-xs mb-1.5 truncate">
                        <span className="text-gray-400">{host}</span>
                        <span className="font-semibold text-gray-700">{path}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2.5 bg-[#8590a2] rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-6 text-right shrink-0">{count}</span>
                      </div>
                    </div>
                  )
                })}
                <div className="flex justify-between text-[10px] text-gray-300 mt-1 px-0.5">
                  <span>0</span>
                  <span>{Math.round(maxIssueCount / 3)}</span>
                  <span>{Math.round((maxIssueCount * 2) / 3)}</span>
                  <span>{maxIssueCount}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-6">No data yet</div>
            )}
          </div>
        </div>

        {/* Issues log */}
        <div className="flex-1 w-full bg-white rounded-lg border border-[#dfe4f3] shadow-sm pt-[37px] pb-[26px] px-[51px] min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-[5px]">
              <h2 className="text-[20px] font-semibold text-[#2e3240] tracking-[-0.2px] leading-[24px]">Issues log</h2>
              <p className="text-[13px] text-[#73767f] leading-[20px]">Optimize your website for peak performance by resolving these issues</p>
            </div>
            {scanId && (
              <Link
                to="/scans/$scanId/issues"
                params={{ scanId: scanId }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium shrink-0 mt-1"
              >
                View all issues →
              </Link>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-end justify-between mt-[52px] border-b border-gray-100 overflow-x-auto">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex flex-col items-center gap-1.5 pb-3 border-b-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0',
                  activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          {pagedIssues.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-12">No issues in this category</div>
          ) : (
            <table className="w-full mt-2">
              <thead>
                <tr className="bg-[#f2f3f8] rounded-[10px]">
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-4 py-[15px] tracking-[-0.13px]">Name</th>
                  <th className="text-left text-[13px] font-medium text-[#2e3240] px-4 py-[15px] w-32 tracking-[-0.13px]">Priority</th>
                  <th className="text-left text-[13px] font-medium text-[#21242d] px-4 py-[15px] w-28 tracking-[-0.13px]">Category</th>
                  <th className="text-right text-[13px] font-medium text-[#2e3240] px-4 py-[15px] w-28 tracking-[-0.13px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedIssues.map((issue) => {
                  return (
                    <tr key={issue.id} className="border-t border-[#eaebec] hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-[26px] text-[14px] text-[#2e3240] leading-[1.4] tracking-[-0.14px] overflow-hidden text-ellipsis whitespace-nowrap max-w-[300px]">{issue.title}</td>
                      <td className="px-4 py-[26px]">
                        <PriorityBadge priority={issue.priority} />
                      </td>
                      <td className="px-4 py-[26px]">{categoryIcon(issue.category)}</td>
                      <td className="px-4 py-[26px] text-right">
                        {issue.category === 'performance' ? (
                          <Link to="/performance" search={{ tab: 'Issues list', issueId: issue.id }} className="text-[12px] text-[#0b66e4] underline font-medium tracking-[-0.24px]">View more</Link>
                        ) : issue.category === 'seo' ? (
                          <Link to="/seo" search={{ tab: 'Issues list', issueId: issue.id }} className="text-[12px] text-[#0b66e4] underline font-medium tracking-[-0.24px]">View more</Link>
                        ) : (issue.category === 'best_practices' || issue.category === 'quality') ? (
                          <Link to="/quality" search={{ tab: 'Issues list', issueId: issue.id }} className="text-[12px] text-[#0b66e4] underline font-medium tracking-[-0.24px]">View more</Link>
                        ) : (
                          <Link to="/accessibility" search={{ tab: 'Issues list', issueId: issue.id }} className="text-[12px] text-[#0b66e4] underline font-medium tracking-[-0.24px]">View more</Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Pagination — always show items-per-page, conditionally show page buttons */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Items per page</span>
              <div className="flex items-center border border-gray-200 rounded px-2 py-1 gap-1.5">
                <span className="text-xs text-gray-800 min-w-[1rem] text-center">{itemsPerPage}</span>
                <div className="flex flex-col">
                  <button onClick={() => { setItemsPerPage((p) => Math.min(p + 5, 50)) }} className="text-gray-400 hover:text-gray-700 leading-none text-[9px]">▲</button>
                  <button onClick={() => { setItemsPerPage((p) => Math.max(p - 5, 5)) }} className="text-gray-400 hover:text-gray-700 leading-none text-[9px]">▼</button>
                </div>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm"
                >
                  ‹
                </button>
                {pageNums.map((n, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof n === 'number' && setCurrentPage(n)}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded text-xs transition-colors',
                      n === currentPage
                        ? 'border border-[#1160c6] text-[#1160c6] font-semibold'
                        : n === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-[#4e4b66] border border-[#c7cade] hover:bg-gray-50'
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {pagesOpen && scanId && (
      <ScannedPagesModal scanJobId={scanId} onClose={() => setPagesOpen(false)} />
    )}
    </>
  )
}
