import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { getScanIssues } from '../../../../api/scans'
import type { IssueCategory, IssueSeverity } from '../../../../types'
import { AccessibilityIcon, PerformanceIcon, QualityIcon, SeoIcon } from '../../../../components/ui/CategoryIcons'
import { PriorityBadge } from '../../../../components/ui/PriorityBadge'
import { FREE_PLAN_PREVIEW_ROWS, FREE_PLAN_VISIBLE_ROWS } from '../../../../lib/planLimits'
import { LockedRowsOverlay } from '../../../../components/UpgradeLock'

export const Route = createFileRoute('/_app/scans/$scanId/issues')({
  component: IssuesPage,
})

const PAGE_SIZE = 20

const CATEGORIES: { value: IssueCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'performance', label: 'Performance' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'best_practices', label: 'Best Practices' },
  { value: 'seo', label: 'SEO' },
]

const CATEGORY_ICON: Record<IssueCategory, ReactNode> = {
  accessibility:  <AccessibilityIcon className="w-5 h-5 text-gray-900" />,
  performance:    <PerformanceIcon className="w-5 h-5 text-gray-900" />,
  seo:            <SeoIcon className="w-5 h-5 text-gray-900" />,
  best_practices: <QualityIcon className="w-5 h-5 text-gray-900" />,
  quality:        <QualityIcon className="w-5 h-5 text-gray-900" />,
}

function CategoryIcon({ category }: { category: IssueCategory }) {
  return <>{CATEGORY_ICON[category] ?? CATEGORY_ICON.best_practices}</>
}


function IssuesPage() {
  const { scanId } = Route.useParams()
  const [category, setCategory] = useState<IssueCategory | 'all'>('all')
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['issues', scanId, category, severity, page],
    queryFn: () =>
      getScanIssues(
        scanId,
        page,
        PAGE_SIZE,
        category !== 'all' ? category : undefined,
        undefined,
        severity !== 'all' ? severity : undefined,
      ),
  })

  const issues = data?.items ?? []

  return (
    <div className="p-6 sm:p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-900 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Total issue list</h1>
      <p className="text-sm text-gray-900 mb-6">A prioritised list of what to do to improve this website.</p>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => { setCategory(c.value as IssueCategory | 'all'); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === c.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(['all', 'critical', 'non_critical'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setSeverity(s); setPage(1) }}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                severity === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {s === 'all' ? 'All Severity' : s === 'critical' ? 'Critical' : 'Non-Critical'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {(() => {
        const renderRow = (issue: typeof issues[number], locked: boolean) => (
          <tr key={issue.id} className={locked ? 'border-t border-gray-50 blur-sm select-none pointer-events-none' : 'border-t border-gray-50 hover:bg-gray-50/60 transition-colors'}>
            <td className="px-6 py-4">
              <div className="text-sm text-gray-800 leading-snug">{issue.title}</div>
            </td>
            <td className="px-4 py-4">
              <PriorityBadge priority={issue.priority} />
            </td>
            <td className="px-4 py-4">
              <CategoryIcon category={issue.category} />
            </td>
            <td className="px-6 py-4 text-right">
              {locked ? (
                <span className="text-xs text-blue-600 font-medium">View more</span>
              ) : issue.category === 'performance' ? (
                <Link to="/performance" search={{ tab: 'Issues list', issueId: issue.id }} className="text-xs text-blue-600 hover:underline font-medium">View more</Link>
              ) : issue.category === 'seo' ? (
                <Link to="/seo" search={{ tab: 'Issues list', issueId: issue.id }} className="text-xs text-blue-600 hover:underline font-medium">View more</Link>
              ) : (issue.category === 'best_practices' || issue.category === 'quality') ? (
                <Link to="/quality" search={{ tab: 'Issues list', issueId: issue.id }} className="text-xs text-blue-600 hover:underline font-medium">View more</Link>
              ) : (
                <Link to="/accessibility" search={{ tab: 'Issues list', issueId: issue.id }} className="text-xs text-blue-600 hover:underline font-medium">View more</Link>
              )}
            </td>
          </tr>
        )
        const isRestricted = !!data?.is_restricted
        const visible = isRestricted ? issues.slice(0, FREE_PLAN_VISIBLE_ROWS) : issues
        const locked = isRestricted ? issues.slice(FREE_PLAN_VISIBLE_ROWS, FREE_PLAN_PREVIEW_ROWS) : []
        return (
          <>
            <div className={cn('bg-white border border-gray-100 shadow-sm overflow-hidden', locked.length > 0 ? 'rounded-t-sm border-b-0' : 'rounded-sm')}>
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-900 px-6 py-3">Issue</th>
                    <th className="text-left text-xs font-semibold text-gray-900 px-4 py-3 w-32">Priority</th>
                    <th className="text-left text-xs font-semibold text-gray-900 px-4 py-3 w-28">Category</th>
                    <th className="text-right text-xs font-semibold text-gray-900 px-6 py-3 w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={4} className="py-16 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                    </td></tr>
                  ) : issues.length === 0 ? (
                    <tr><td colSpan={4} className="py-16 text-center text-sm text-gray-400">No issues found.</td></tr>
                  ) : visible.map((issue) => renderRow(issue, false))}
                </tbody>
              </table>
            </div>
            {(locked.length > 0 || isRestricted) && (
              <div className="relative overflow-hidden bg-white border border-gray-200 rounded-b-[8px] min-h-[120px]">
                <table className="w-full table-fixed">
                  <tbody>
                    {locked.map((issue) => renderRow(issue, true))}
                  </tbody>
                </table>
                <LockedRowsOverlay totalCount={data?.total ?? issues.length} shown={visible.length} force={isRestricted} />
              </div>
            )}
          </>
        )
      })()}

      {!isLoading && data && data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-400">Page {data.page} of {data.total_pages} · {data.total} total</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
              className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {!isLoading && data && data.total_pages <= 1 && issues.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-right">{data.total} total</p>
      )}
    </div>
  )
}
