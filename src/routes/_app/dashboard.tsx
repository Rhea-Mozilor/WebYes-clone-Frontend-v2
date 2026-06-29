import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
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
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSiteStore } from '../../store/siteStore'
import { listWebsites, createWebsite } from '../../api/websites'
import { getWebsiteScanHistory, getScanSummary } from '../../api/scans'
import { listIssues } from '../../api/issues'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog'
import type { IssueCategory } from '../../types'

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
  accessibility: '#3b82f6',
  performance: '#f59e0b',
  best_practices: '#8b5cf6',
  seo: '#10b981',
}

function scoreIconBg(score: number) {
  if (score >= 90) return 'bg-green-50 text-green-600'
  if (score >= 50) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
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

function DashboardPage() {
  const { websiteId, setWebsiteId } = useSiteStore()
  const [activeTab, setActiveTab] = useState<IssueCategory | 'all'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)

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

  const { data: issues = [] } = useQuery({
    queryKey: ['issues', latestScan?.scan_job_id],
    queryFn: () => listIssues({ scan_job_id: latestScan!.scan_job_id }),
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

  const scanTime = latestScan?.scanned_at
    ? new Date(latestScan.scanned_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
    : null

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      {/* ── Site health overview ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Site health overview</h1>
            <div className="flex items-center gap-3 text-sm">
              <a
                href={selectedWebsite?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                {selectedWebsite?.url?.replace(/^https?:\/\//, '')}
              </a>
              {latestScan && (
                <Link
                  to="/websites/$websiteId"
                  params={{ websiteId: websiteId! }}
                  className="text-gray-500 hover:text-blue-600 hover:underline"
                >
                  View scanned page details
                </Link>
              )}
            </div>
          </div>
          {scanTime && (
            <span className="text-xs text-gray-400 mt-1">{scanTime}</span>
          )}
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const stats = summary.scores[key]
            const score = stats ? Math.round(stats.avg) : null
            const count = issueCounts[key as keyof typeof issueCounts] as number

            return (
              <div key={key} className="border border-gray-100 rounded-xl p-5">
                {/* Icon */}
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', score != null ? scoreIconBg(score) : 'bg-gray-50 text-gray-400')}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="text-sm text-gray-500 mb-1">{label}</div>

                {/* Score */}
                <div className="flex items-baseline gap-2 mb-3">
                  {score != null ? (
                    <span className="text-2xl sm:text-3xl font-bold text-gray-900">{score}%</span>
                  ) : (
                    <span className="text-3xl font-bold text-gray-300">—</span>
                  )}
                </div>

                {/* Total issues */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>Total issues : <span className="font-semibold text-gray-800">{count}</span></span>
                  <Info className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom row ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-start">
        {/* Overall issues */}
        <div className="w-full lg:w-64 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Overall issues</h2>

          <div className="flex gap-3 mb-5">
            <div className="flex-1 bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                Total issues <Info className="w-3 h-3 text-gray-300" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{issueCounts.total}</div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                Critical issues <Info className="w-3 h-3 text-gray-300" />
              </div>
              <div className="text-2xl font-bold text-red-500">{issueCounts.critical}</div>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-700 mb-3">Total issues</h3>

          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="mt-3 space-y-1.5">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-400 text-center py-8">No issues found</div>
          )}
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
          {filteredIssues.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-12">No issues in this category</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4 w-24">Priority</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 pr-4 w-24">Category</th>
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2.5 w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredIssues.slice(0, 20).map((issue) => (
                    <tr key={issue.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4">
                        <span className="text-xs text-gray-800 font-medium truncate block max-w-xs" title={issue.title}>
                          {issue.title}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                            issue.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {issue.severity === 'critical' ? 'Critical' : 'Non-critical'}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
