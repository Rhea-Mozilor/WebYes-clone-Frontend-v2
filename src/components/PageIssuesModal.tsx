import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { PriorityBadge } from './ui/PriorityBadge'
import { getPageCategoryIssues } from '../api/scans'
import type { PageCategoryIssue } from '../types'

type Category = 'accessibility' | 'performance' | 'quality' | 'seo'


interface Props {
  scanJobId: string
  scanResultId: string
  pageUrl: string
  category: Category
  onClose: () => void
}

export function PageIssuesModal({ scanJobId, scanResultId, pageUrl, category, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['page-category-issues', scanJobId, category, scanResultId],
    queryFn: () => getPageCategoryIssues(scanJobId, category, scanResultId),
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const issues: PageCategoryIssue[] = data?.issues ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-lg mx-0 sm:mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-0.5 capitalize">{category}</p>
            <h3 className="text-[15px] font-semibold text-gray-900 leading-snug break-all">{pageUrl}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 shrink-0 mt-0.5"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          ) : issues.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No issues found for this page</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {issues.map(issue => (
                <div key={issue.issue_id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{issue.title}</p>
                    {issue.display_value && (
                      <p className="text-xs text-gray-400 mt-0.5">{issue.display_value}</p>
                    )}
                  </div>
                  <PriorityBadge priority={issue.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {data && (
          <div className="px-5 py-3 border-t border-gray-100 shrink-0">
            <p className="text-xs text-gray-400">{issues.length} issue{issues.length !== 1 ? 's' : ''} on this page</p>
          </div>
        )}
      </div>
    </div>
  )
}
