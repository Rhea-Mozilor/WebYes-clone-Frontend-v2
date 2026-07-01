import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, Eye, EyeOff, Copy } from 'lucide-react'
import { cn } from '../lib/utils'
import { getIssueDetail } from '../api/issues'

function priorityPill(priority: string) {
  if (priority === 'high') return 'border-orange-300 bg-orange-50 text-orange-600'
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-600'
  return 'border-gray-300 bg-gray-50 text-gray-500'
}

function categoryBadge(priority: string) {
  if (priority === 'high') return { cls: 'border-green-200 bg-green-50 text-green-700', icon: '</>', label: 'Development' }
  return { cls: 'border-purple-200 bg-purple-50 text-purple-700', icon: '✏', label: 'Design' }
}

interface Props {
  issueId: string
  onClose: () => void
}

export function IssueDetailPanel({ issueId, onClose }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [copied, setCopied] = useState(false)

  const { data: detail, isLoading } = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => getIssueDetail(issueId),
  })

  const allElements = detail?.affected_pages.flatMap((page) =>
    page.elements.length > 0
      ? page.elements.map((el) => ({ ...el, page_url: page.page_url }))
      : [{ thumbnail: null, selector: null, snippet: null, url: null, extra: null, page_url: page.page_url }]
  ) ?? []

  const current = allElements[selectedIdx] ?? null
  const cat = categoryBadge(detail?.priority ?? '')

  function copySelector() {
    if (current?.selector) {
      navigator.clipboard.writeText(current.selector)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dimmed backdrop — click to close */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          {isLoading ? (
            <div className="h-6 w-2/3 bg-gray-100 rounded animate-pulse" />
          ) : (
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{detail?.title}</h2>
          )}
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0 mt-0.5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Failed to load</div>
        ) : (
          <>
            {/* Meta row */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap shrink-0">
              {detail.display_value && (
                <span className="px-2 py-1 rounded border border-gray-300 text-xs font-medium text-gray-700">
                  {detail.display_value}
                </span>
              )}

              {/* Affected users icons */}
              <span className="text-xs text-gray-500 flex items-center gap-1.5">
                Affected users:
                <Eye className="w-4 h-4 text-gray-400" />
                <EyeOff className="w-4 h-4 text-gray-400" />
              </span>

              <span className="text-gray-300">|</span>

              <span className="text-xs text-gray-500">Priority:</span>
              <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium border', priorityPill(detail.priority))}>
                {detail.priority.charAt(0).toUpperCase() + detail.priority.slice(1)}
              </span>

              <span className="text-gray-300">|</span>

              <span className="text-xs text-gray-500">Category:</span>
              <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border', cat.cls)}>
                <span className="font-mono text-xs">{cat.icon}</span> {cat.label}
              </span>
            </div>

            {/* Description */}
            {detail.description && (
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>
              </div>
            )}

            {/* Elements split view */}
            {allElements.length > 0 ? (
              <div className="flex flex-1 min-h-0 border-t border-gray-50">
                {/* Left: elements list */}
                <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">Elements list</span>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {allElements.map((el, i) => (
                      <button key={i} onClick={() => setSelectedIdx(i)}
                        className={cn(
                          'w-full text-left px-4 py-3 border-b border-gray-50 flex items-center justify-between gap-2 transition-colors',
                          selectedIdx === i
                            ? 'border-l-2 border-l-blue-500 bg-blue-50/40'
                            : 'hover:bg-gray-50'
                        )}>
                        <span className="text-xs text-gray-600 truncate font-mono">
                          {el.selector ?? el.url ?? el.page_url ?? '—'}
                        </span>
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center shrink-0">1</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: element details */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Element details</span>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      Occurrence {selectedIdx + 1} of {allElements.length}
                      <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
                        disabled={selectedIdx === 0}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setSelectedIdx(Math.min(allElements.length - 1, selectedIdx + 1))}
                        disabled={selectedIdx === allElements.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {current && (
                    <div className="rounded-xl border border-gray-200 bg-blue-50/20 p-4">
                      <div className="flex gap-4">
                        {/* Code snippet preview */}
                        <div className="w-32 h-20 shrink-0 rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center p-2">
                          {current.snippet ? (
                            <code className="text-[9px] text-gray-500 break-all leading-tight line-clamp-5 font-mono">
                              {current.snippet}
                            </code>
                          ) : (
                            <span className="text-xs text-gray-300">No preview</span>
                          )}
                        </div>
                        {/* Selector + page */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-gray-400 mb-0.5">Selector:</div>
                              <code className="text-xs text-gray-800 font-mono break-all">
                                {current.selector ?? current.url ?? '—'}
                              </code>
                            </div>
                            <button onClick={copySelector}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 shrink-0 transition-colors"
                              title="Copy selector">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {copied && <span className="text-[10px] text-green-600">Copied!</span>}
                          <div>
                            <div className="text-xs text-gray-400 mb-0.5">Affected page:</div>
                            <a href={current.page_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline break-all">
                              {current.page_url}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fix suggestions from extra fields */}
                  {current?.extra && Object.keys(current.extra).length > 0 && (
                    <div className="rounded-xl border border-gray-100 p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">Fix any of the following:</p>
                      <ul className="space-y-2">
                        {Object.entries(current.extra).map(([k, v]) => (
                          <li key={k} className="flex gap-2 text-sm text-gray-600">
                            <span className="shrink-0 mt-0.5">•</span>
                            <span><span className="font-medium text-gray-700">{k}:</span> {String(v)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fallback: show description as fix */}
                  {(!current?.extra || Object.keys(current.extra).length === 0) && detail.description && (
                    <div className="rounded-xl border border-gray-100 p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">How to fix:</p>
                      <p className="text-sm text-gray-600">{detail.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No elements — just show description */
              <div className="flex-1 px-6 py-4">
                {detail.description && (
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">How to fix:</p>
                    <p className="text-sm text-gray-600">{detail.description}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
