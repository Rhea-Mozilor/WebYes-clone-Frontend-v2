import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, Loader2,
  Code2, Pen, AlignLeft,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { PriorityBadge } from './ui/PriorityBadge'
import { getAccessibilityPageIssues } from '../api/scans'
import { IssueDetailPanel } from './IssueDetailPanel'
import type { AccessibilityPageIssue } from '../types'

interface Props {
  scanJobId: string
  scanResultId: string
  pageUrl: string
  onBack: () => void
}

const CATEGORY_META = [
  { key: 'development', label: 'Development', Icon: Code2, color: '#2e7d32', border: '#c8e6c9', bg: '#f1f8f1' },
  { key: 'design',      label: 'Design',      Icon: Pen,   color: '#7b1fa2', border: '#e1bee7', bg: '#faf0fc' },
  { key: 'content',     label: 'Content',     Icon: AlignLeft, color: '#1565c0', border: '#bbdefb', bg: '#f0f6ff' },
]


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

export function AccessibilityPageDetail({ scanJobId, scanResultId, pageUrl, onBack }: Props) {
  const [search, _setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accessibility-page-issues', scanJobId, scanResultId],
    queryFn: () => getAccessibilityPageIssues(scanJobId, scanResultId),
  })

  const issues: AccessibilityPageIssue[] = data?.issues ?? []

  const filtered = issues.filter(i => {
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false
    if (catFilter && i.responsibility?.toLowerCase() !== catFilter) return false
    return true
  })

  const categoryCount = (key: string) =>
    issues.filter(i => i.responsibility?.toLowerCase() === key).length

  return (
    <div className="flex flex-col min-h-full bg-[#f7f8fc]">
      {/* Back */}
      <div className="bg-white px-6 py-3">
        <button onClick={onBack} className="flex items-center gap-1 text-[#0a5dcf] text-sm font-medium hover:underline">
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

      <div className="flex-1 p-6 space-y-5">
        <>

            {/* Category cards */}
            <div className="flex gap-4">
              {CATEGORY_META.map(({ key, label, Icon, color, border, bg }) => (
                <button
                  key={key}
                  onClick={() => setCatFilter(catFilter === key ? null : key)}
                  className={cn(
                    'flex-1 bg-white rounded-[8px] p-4 flex items-center gap-3 text-left transition-all border',
                    catFilter === key ? 'border-[#9db7f4] shadow-sm' : 'border-gray-200 hover:border-[#c0c8dc]'
                  )}
                >
                  <div className="w-10 h-10 rounded-[6px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color }}>{label}</div>
                    <div className="text-[13px] text-[#2e3240] font-medium">{categoryCount(key)} issues</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Issues table */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No issues found</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-[8px] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f2f3f8]">
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3">Issues</th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-28">Elements</th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-36 flex items-center gap-1">
                        Priority
                      </th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-40">Category</th>
                      <th className="text-left text-[13px] font-medium text-[#2e3240] px-5 py-3 w-44">Conformance level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(issue => {
                      const wcagBadge = [issue.wcag_version, issue.wcag_criterion].filter(Boolean).join(' | ')
                      const resp = issue.responsibility?.toLowerCase() ?? ''
                      const catMeta = CATEGORY_META.find(c => c.key === resp)
                      return (
                        <tr key={issue.issue_id}
                          onClick={() => setSelectedIssueId(issue.issue_id)}
                          className="border-t border-gray-100 hover:bg-gray-50/60 cursor-pointer">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-[#0a5dcf] leading-snug">{issue.title}</span>
                              {wcagBadge && (
                                <span className="text-[11px] text-[#73767f] bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {wcagBadge}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-[14px] text-[#2e3240]">{issue.item_count}</td>
                          <td className="px-5 py-4">
                            <PriorityBadge priority={issue.priority} />
                          </td>
                          <td className="px-5 py-4">
                            {catMeta ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium"
                                style={{ backgroundColor: catMeta.bg, color: catMeta.color, border: `1px solid ${catMeta.border}` }}>
                                <catMeta.Icon className="w-3.5 h-3.5" />
                                {catMeta.label}
                              </span>
                            ) : issue.responsibility ? (
                              <span className="text-xs text-[#2e3240]">{issue.responsibility}</span>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-[13px] text-[#2e3240]">
                            {issue.wcag_level || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </>
      </div>

      {selectedIssueId && (
        <IssueDetailPanel issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} variant="accessibility" />
      )}
    </div>
  )
}
