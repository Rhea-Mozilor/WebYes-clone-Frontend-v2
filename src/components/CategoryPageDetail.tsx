import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Loader2, Search } from 'lucide-react'
import { PriorityBadge } from './ui/PriorityBadge'
import { getPageCategoryIssues } from '../api/scans'
import { IssueDetailPanel } from './IssueDetailPanel'
import { FREE_PLAN_PREVIEW_ROWS, FREE_PLAN_VISIBLE_ROWS } from '../lib/planLimits'
import { LockedRowsOverlay } from './UpgradeLock'
import type { PageCategoryIssue } from '../types'

type Category = 'quality' | 'seo'

interface Props {
  scanJobId: string
  scanResultId: string
  pageUrl: string
  category: Category
  onBack: () => void
}


function pageName(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '')
    const parts = path.split('/').filter(Boolean)
    if (!parts.length) return 'Home'
    return decodeURIComponent(parts[parts.length - 1])
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  } catch { return url }
}

export function CategoryPageDetail({ scanJobId, scanResultId, pageUrl, category, onBack }: Props) {
  const [search, setSearch] = useState('')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['category-page-issues', scanJobId, category, scanResultId],
    queryFn: () => getPageCategoryIssues(scanJobId, category, scanResultId),
  })

  const issues: PageCategoryIssue[] = data?.issues ?? []
  const filtered = issues.filter(
    i => !search || i.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col min-h-full bg-[#f7f8fc]">
      {/* Back */}
      <div className="bg-white px-6 py-3">
        <button onClick={onBack} className="flex items-center gap-1 text-[#2e3240] text-sm font-medium hover:opacity-70">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Page header */}
      <div className="bg-white px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold text-[#2e3240] tracking-[-0.44px] leading-tight">
            {data?.page_title || pageName(pageUrl)}
          </h2>
          <a href={pageUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#0a5dcf] hover:underline mt-1 inline-block break-all">
            {pageUrl}
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex">
          <button className="px-4 py-3 text-sm font-medium border-b-2 border-[#0b66e4] text-[#0b66e4] -mb-px whitespace-nowrap">
            All issues
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[16px] font-semibold text-[#2e3240]">All issues</h3>
          <div className="flex items-center gap-2 border border-gray-300 rounded-[6px] px-3 h-9 w-52">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search issues"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm text-gray-700 placeholder-gray-400 outline-none flex-1 bg-transparent"
            />
          </div>
        </div>

        {/* Issues table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-16">No issues found</p>
        ) : (() => {
          const renderRow = (issue: PageCategoryIssue, locked: boolean) => (
            <tr key={issue.issue_id}
              onClick={() => !locked && setSelectedIssueId(issue.issue_id)}
              className={locked ? 'border-t border-gray-100 blur-sm select-none pointer-events-none' : 'border-t border-gray-100 hover:bg-gray-50/60 cursor-pointer'}>
              <td className="px-5 py-4">
                <span className="text-sm text-[#0a5dcf] leading-snug">{issue.title}</span>
                {issue.display_value && (
                  <span className="text-xs text-[#73767f] ml-2">{issue.display_value}</span>
                )}
              </td>
              <td className="px-5 py-4 text-[14px] text-[#2e3240]">{issue.item_count}</td>
              <td className="px-5 py-4">
                <PriorityBadge priority={issue.priority} />
              </td>
            </tr>
          )
          const isRestricted = !!data?.is_restricted
          const visible = isRestricted ? filtered.slice(0, FREE_PLAN_VISIBLE_ROWS) : filtered
          const locked = isRestricted ? filtered.slice(FREE_PLAN_VISIBLE_ROWS, FREE_PLAN_PREVIEW_ROWS) : []
          return (
            <>
              <div className={locked.length > 0 ? 'bg-white border border-gray-200 rounded-t-[8px] border-b-0 overflow-hidden' : 'bg-white border border-gray-200 rounded-[8px] overflow-hidden'}>
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-[#f2f3f8]">
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3">Issues</th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-32">Elements</th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-40">
                        Priority
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(issue => renderRow(issue, false))}
                  </tbody>
                </table>
              </div>
              {(locked.length > 0 || isRestricted) && (
                <div className="relative overflow-hidden bg-white border border-gray-200 rounded-b-[8px] min-h-[120px]">
                  <table className="w-full table-fixed">
                    <tbody>
                      {locked.map(issue => renderRow(issue, true))}
                    </tbody>
                  </table>
                  <LockedRowsOverlay totalCount={filtered.length} shown={visible.length} force={isRestricted} />
                </div>
              )}
            </>
          )
        })()}
      </div>

      {selectedIssueId && (
        <IssueDetailPanel issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} />
      )}
    </div>
  )
}
