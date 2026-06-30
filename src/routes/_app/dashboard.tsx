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
  Info,
  User,
  Activity,
  Award,
  Search,
  Globe,
  Plus,
  Loader2,
  X,
  Share2,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { useAuthStore } from '../../store/authStore'
import { listWebsites, createWebsite } from '../../api/websites'
import { getWebsiteScanHistory, getScanSummary, getPageScores } from '../../api/scans'
import { listIssues } from '../../api/issues'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog'
import type { IssueCategory, IssuePriority, IssueSeverity } from '../../types'

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
})

const CATEGORIES = [
  { key: 'accessibility' as IssueCategory, label: 'Accessibility', Icon: User },
  { key: 'performance' as IssueCategory, label: 'Performance', Icon: Activity },
  { key: 'best_practices' as IssueCategory, label: 'Quality', Icon: Award },
  { key: 'seo' as IssueCategory, label: 'SEO', Icon: Search },
]

const TABS: { key: IssueCategory | 'all'; label: string; Icon: React.ElementType }[] = [
  { key: 'all', label: 'All', Icon: Activity },
  { key: 'accessibility', label: 'Accessibility', Icon: User },
  { key: 'performance', label: 'Performance', Icon: Activity },
  { key: 'best_practices', label: 'Quality', Icon: Award },
  { key: 'seo', label: 'SEO', Icon: Search },
]

const PIE_COLORS: Record<IssueCategory, string> = {
  performance: '#c5d0e8',
  accessibility: '#1a2f5e',
  best_practices: '#4dcfca',
  seo: '#7b8fd4',
}

function scoreIconBg(score: number) {
  if (score >= 90) return 'bg-green-50 text-green-600'
  if (score >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

function scoreTextColor(score: number | null) {
  if (score == null) return 'text-gray-300'
  if (score < 50) return 'text-red-500'
  return 'text-gray-900'
}

function categoryLabel(cat: IssueCategory) {
  return CATEGORIES.find((c) => c.key === cat)?.label ?? cat
}

function categoryIcon(cat: IssueCategory) {
  const found = CATEGORIES.find((c) => c.key === cat)
  if (!found) return null
  const Icon = found.Icon
  return <Icon className="w-3.5 h-3.5 text-gray-400" />
}

function priorityChip(priority: IssuePriority, severity: IssueSeverity): { label: string; cls: string } {
  if (severity === 'critical') return { label: 'Critical', cls: 'bg-red-100 text-red-700' }
  if (priority === 'high') return { label: 'Moderate', cls: 'bg-orange-100 text-orange-700' }
  if (priority === 'medium') return { label: 'Medium', cls: 'bg-amber-50 text-amber-600' }
  return { label: 'Low', cls: 'bg-gray-100 text-gray-500' }
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
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
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
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

function GetReportModal({ ownerName, ownerEmail, onClose }: { ownerName: string; ownerEmail: string; onClose: () => void }) {
  const [extraEmails, setExtraEmails] = useState<string[]>([])
  const [inputVal, setInputVal] = useState('')
  const [showExtra, setShowExtra] = useState(true)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function addEmail(email: string) {
    const trimmed = email.trim().toLowerCase()
    if (trimmed && !extraEmails.includes(trimmed)) {
      setExtraEmails((prev) => [...prev, trimmed])
    }
    setInputVal('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail(inputVal)
    }
    if (e.key === 'Backspace' && !inputVal && extraEmails.length > 0) {
      setExtraEmails((prev) => prev.slice(0, -1))
    }
  }

  function handleSend() {
    toast.success('Report sent!')
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Get the report</h2>
        <p className="text-sm text-gray-500 mb-5">We will send the report to your email</p>

        {/* Owner row */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{ownerName}</p>
            <p className="text-xs text-gray-400 truncate">{ownerEmail}</p>
          </div>
          <span className="text-xs text-gray-400 shrink-0">Owner</span>
        </div>

        {/* Send to someone else */}
        <button
          className="flex items-center justify-between w-full py-4 border-b border-gray-100"
          onClick={() => setShowExtra((v) => !v)}
        >
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Send to someone else?
          </div>
          <svg className={cn('w-4 h-4 text-gray-400 transition-transform', showExtra ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Email chip input */}
        {showExtra && (
          <div className="mt-3 mb-5">
            <div className="border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 min-h-[56px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              {extraEmails.map((email) => (
                <span key={email} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l3-3m0 0l3-3m-3 3l3 3m-3-3l-3 3" />
                  </svg>
                  {email}
                  <button onClick={() => setExtraEmails((prev) => prev.filter((e) => e !== email))} className="ml-0.5 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => inputVal && addEmail(inputVal)}
                placeholder={extraEmails.length === 0 ? 'Type email and press Enter' : ''}
                className="flex-1 min-w-[140px] text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSend}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2"
        >
          Send
        </button>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { websiteId, setWebsiteId } = useSiteStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<IssueCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const { data: websites = [], refetch: refetchWebsites } = useQuery({
    queryKey: ['websites'],
    queryFn: listWebsites,
  })

  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['history', websiteId],
    queryFn: () => getWebsiteScanHistory(websiteId!),
    enabled: !!websiteId,
    refetchInterval: 10_000,
  })

  const completedScans = history.filter((h) => h.status === 'completed')
  const latestScan = completedScans[0]

  const { data: summary } = useQuery({
    queryKey: ['summary', latestScan?.scan_job_id],
    queryFn: () => getScanSummary(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const prevScan = completedScans[1]
  const { data: prevSummary } = useQuery({
    queryKey: ['summary', prevScan?.scan_job_id],
    queryFn: () => getScanSummary(prevScan!.scan_job_id),
    enabled: !!prevScan,
  })

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id }),
    enabled: !!latestScan,
  })

  const { data: pageScores = [] } = useQuery({
    queryKey: ['page-scores', latestScan?.scan_job_id],
    queryFn: () => getPageScores(latestScan!.scan_job_id),
    enabled: !!latestScan,
  })

  const selectedWebsite = websites.find((w) => w.id === websiteId)

  // Deduplicate issues by rule_id for the table
  const uniqueIssues = useMemo(() => {
    const seen = new Set<string>()
    return issues.filter((issue) => {
      if (seen.has(issue.rule_id)) return false
      seen.add(issue.rule_id)
      return true
    })
  }, [issues])

  const filteredIssues =
    activeTab === 'all' ? uniqueIssues : uniqueIssues.filter((i) => i.category === activeTab)

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / itemsPerPage))
  const pagedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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

  // Issue counts per category
  const issueCounts = useMemo(() => ({
    total: issues.length,
    critical: issues.filter((i) => i.severity === 'critical').length,
    accessibility: issues.filter((i) => i.category === 'accessibility').length,
    performance: issues.filter((i) => i.category === 'performance').length,
    best_practices: issues.filter((i) => i.category === 'best_practices').length,
    seo: issues.filter((i) => i.category === 'seo').length,
  }), [issues])

  const pieData = [
    { name: 'Accessibility', value: issueCounts.accessibility, color: PIE_COLORS.accessibility },
    { name: 'Performance', value: issueCounts.performance, color: PIE_COLORS.performance },
    { name: 'Quality', value: issueCounts.best_practices, color: PIE_COLORS.best_practices },
    { name: 'SEO', value: issueCounts.seo, color: PIE_COLORS.seo },
  ].filter((d) => d.value > 0)

  const issuesPerPage = useMemo(() => {
    if (!pageScores.length) return []
    const urlMap = new Map(pageScores.map((p) => [p.scan_result_id, p.page_url]))
    const counts = new Map<string, number>()
    issues.forEach((i) => {
      const url = urlMap.get(i.scan_result_id)
      if (url) counts.set(url, (counts.get(url) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [issues, pageScores])

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
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">No websites yet</h3>
        <p className="text-sm text-gray-500 mb-5">Add your first website to start auditing</p>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input type="url" placeholder="https://example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setAddOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={adding}
                  className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
  if (!histLoading && latestScan == null) {
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
  if (histLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const scanDateTime = latestScan?.scanned_at
    ? new Date(latestScan.scanned_at).toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null

  return (
    <>
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      {/* ── Site health overview ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Site health overview</h1>
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
              {latestScan && (
                <>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setPagesOpen(true)}
                    className="text-blue-600 hover:underline"
                  >
                    View scanned page details
                  </button>
                </>
              )}
            </div>
          </div>

          {scanDateTime && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{scanDateTime}</span>
                <Info className="w-3 h-3 text-gray-300" />
              </div>
              {/* Get report button */}
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Get report
              </button>
            </div>
          )}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const stats = summary.scores[key]
            const score = stats ? Math.round(stats.avg) : null
            const prevStats = prevSummary?.scores?.[key]
            const prevScore = prevStats ? Math.round(prevStats.avg) : null
            const trend = score != null && prevScore != null ? score - prevScore : null
            const count = issueCounts[key as keyof typeof issueCounts] as number

            return (
              <div key={key} className="border border-gray-100 rounded-xl p-5">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-500" />
                </div>

                <div className="text-sm text-gray-500 mb-2">{label}</div>

                {/* Score + trend */}
                <div className="flex items-baseline gap-2 mb-4">
                  {score != null ? (
                    <span className={cn('text-3xl font-bold', scoreTextColor(score))}>{score}%</span>
                  ) : (
                    <span className="text-3xl font-bold text-gray-300">—</span>
                  )}
                  {trend != null && (
                    <span className={cn('flex items-center text-xs font-medium', trend >= 0 ? 'text-green-500' : 'text-red-500')}>
                      {trend >= 0
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(trend)}%
                    </span>
                  )}
                </div>

                {/* Total issues */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Total issues : <span className="text-gray-800">{count}</span></span>
                  <Info className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">

        {/* Left column */}
        <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 sm:gap-5">

          {/* Card 1: Overall issues */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Overall issues</h2>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex-1 p-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  Total issues <Info className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{issueCounts.total}</div>
              </div>
              <div className="w-px bg-gray-200 shrink-0" />
              <div className="flex-1 p-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  Critical issues <Info className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{issueCounts.critical}</div>
              </div>
            </div>
          </div>

          {/* Card 2: Total issues donut */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Issues per page</h2>
              {latestScan && (
                <Link
                  to="/scans/$scanId/issues"
                  params={{ scanId: latestScan.scan_job_id }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  View all issues <span className="ml-0.5">→</span>
                </Link>
              )}
            </div>

            {issuesPerPage.length > 0 ? (
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
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 bg-slate-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
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
        <div className="flex-1 w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 min-w-0">
          <div className="mb-1">
            <h2 className="text-sm font-bold text-gray-900">Issues log</h2>
            <p className="text-xs text-gray-400 mt-0.5">Optimize your website for peak performance by resolving these issues</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-100 mb-4 mt-4 overflow-x-auto">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                  activeTab === key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          {pagedIssues.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-12">No issues in this category</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4 w-28">Priority</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4 w-28">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pagedIssues.map((issue) => {
                    const { label: pLabel, cls: pCls } = priorityChip(issue.priority, issue.severity)
                    return (
                      <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <span className="text-xs text-gray-800 font-medium truncate block max-w-[220px]" title={issue.title}>
                            {issue.title.length > 48 ? issue.title.slice(0, 48) + '…' : issue.title}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', pCls)}>
                            {pLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            {categoryIcon(issue.category)}
                            <span className="text-xs text-gray-500">{categoryLabel(issue.category)}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <Link
                            to="/scans/$scanId/issues"
                            params={{ scanId: latestScan!.scan_job_id }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            View more
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
                        ? 'border border-gray-800 text-gray-900 font-semibold'
                        : n === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-500 hover:bg-gray-50'
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
            </div>
          )}
        </div>
      </div>
    </div>

    {pagesOpen && latestScan && (
      <ScannedPagesModal scanJobId={latestScan.scan_job_id} onClose={() => setPagesOpen(false)} />
    )}
    {reportOpen && (
      <GetReportModal
        ownerName={user?.username ?? 'You'}
        ownerEmail={user?.email ?? ''}
        onClose={() => setReportOpen(false)}
      />
    )}
    </>
  )
}
