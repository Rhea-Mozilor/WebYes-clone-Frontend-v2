import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronDown, ChevronUp, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { cn } from '../lib/utils'
import { getIssueDetail } from '../api/issues'
import type { IssueRichDetail, IssueAffectedPage, IssueElement } from '../types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function priorityPill(p: string) {
  if (p === 'high') return 'border-red-200 bg-red-50 text-red-600'
  if (p === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-gray-200 bg-gray-50 text-gray-500'
}

function priorityLabel(p: string) {
  if (p === 'high') return 'Critical'
  if (p === 'medium') return 'Moderate'
  return 'Low'
}

// ─── WCAG helpers ─────────────────────────────────────────────────────────────

function parseWcag(tags: string[]): { level: string; criterion: string | null } | null {
  let level: string | null = null
  let criterion: string | null = null
  for (const tag of tags) {
    const lm = tag.match(/^wcag\d*(aa|a)$/)
    if (lm) level = lm[1].toUpperCase()
    const cm = tag.match(/^wcag(\d{3,})$/)
    if (cm) {
      const d = cm[1]
      if (d.length === 3) criterion = `${d[0]}.${d[1]}.${d[2]}`
      else if (d.length === 4) criterion = `${d[0]}.${d[1]}.${d.slice(2)}`
      else criterion = d
    }
  }
  return level || criterion ? { level: level ?? '', criterion } : null
}

function parseDisabilities(tags: string[]): string[] {
  const out = new Set<string>()
  if (tags.some(t => t.startsWith('cat.text-alt') || t.startsWith('cat.name') || t === 'cat.aria'))
    out.add('blind')
  if (tags.some(t => t === 'cat.color' || t.startsWith('cat.sensory')))
    out.add('lowVision')
  if (tags.some(t => t === 'cat.keyboard')) out.add('motor')
  if (tags.some(t => t === 'cat.structure' || t.startsWith('cat.time'))) out.add('cognitive')
  return [...out]
}

// ─── flat element ─────────────────────────────────────────────────────────────

interface FlatEl extends IssueElement {
  page_url: string
}

function flatElements(page: IssueAffectedPage): FlatEl[] {
  if (page.elements.length === 0)
    return [{ thumbnail: null, selector: null, snippet: null, url: null, extra: null, page_url: page.page_url }]
  return page.elements.map(el => ({ ...el, page_url: page.page_url }))
}

// ─── Resource data table ──────────────────────────────────────────────────────

function ResourceTable({ els, detailsType }: { els: FlatEl[]; detailsType: string | null }) {
  const rows = els.filter(e => e.url || (e.extra && Object.keys(e.extra).length > 0))
  if (rows.length === 0) return null

  const hasUrl = rows.some(e => e.url)
  const hasTotal = rows.some(e => e.extra?.totalBytes != null)
  const hasWastedBytes = rows.some(e => e.extra?.wastedBytes != null)
  const hasWastedMs = rows.some(e => e.extra?.wastedMs != null)
  const hasDuration = rows.some(e => e.extra?.duration != null)
  const hasLongest = rows.some(e => e.extra?.isLongest != null)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            {hasUrl && <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">
              {detailsType === 'criticalrequestchain' ? 'Resource' : 'URL'}
            </th>}
            {hasTotal && <th className="text-right px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">Transfer Size</th>}
            {hasDuration && <th className="text-right px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">Duration</th>}
            {(hasWastedBytes || hasWastedMs) && (
              <th className="text-right px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                {hasWastedMs ? 'Est Savings' : 'Est Savings'}
              </th>
            )}
            {hasLongest && <th className="px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">Longest Path</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((el, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              {hasUrl && (
                <td className="px-3 py-2.5 max-w-xs">
                  {!!el.extra?.label && (
                    <div className="text-[10px] text-gray-400 mb-0.5">{String(el.extra.label)}</div>
                  )}
                  <a href={el.url!} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-mono break-all text-[11px]">
                    {el.url}
                  </a>
                </td>
              )}
              {hasTotal && (
                <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap font-mono">
                  {fmtBytes(el.extra?.totalBytes as number | undefined)}
                </td>
              )}
              {hasDuration && (
                <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap font-mono">
                  {fmtMs(el.extra?.duration as number | undefined)}
                </td>
              )}
              {(hasWastedBytes || hasWastedMs) && (
                <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                  <span className="font-medium text-gray-700">
                    {hasWastedMs
                      ? fmtMs(el.extra?.wastedMs as number | undefined)
                      : fmtBytes(el.extra?.wastedBytes as number | undefined)}
                  </span>
                </td>
              )}
              {hasLongest && (
                <td className="px-3 py-2.5 text-center">
                  {!!el.extra?.isLongest && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">Longest</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Performance / resource accordion view ───────────────────────────────────

function ResourceAccordionView({ detail }: { detail: IssueRichDetail }) {
  const [openIdx, setOpenIdx] = useState<number>(0)

  // Summary savings line
  const savingsLine = (() => {
    if (detail.wasted_ms != null)
      return `Potential time savings: ${fmtMs(detail.wasted_ms)}`
    if (detail.wasted_bytes != null)
      return `Estimated total savings: ${fmtBytes(detail.wasted_bytes)}`
    return null
  })()

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Top section: priority + description */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-500">Priority:</span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', priorityPill(detail.priority))}>
            {priorityLabel(detail.priority)}
          </span>
        </div>
        {detail.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
        )}
      </div>

      {/* Page accordions */}
      <div className="px-4 py-3 space-y-3">
        {detail.affected_pages
          .reduce((acc, page) => {
            const existing = acc.find(p => p.page_url === page.page_url)
            if (existing) {
              existing.elements.push(...page.elements)
            } else {
              acc.push({ ...page, elements: [...page.elements] })
            }
            return acc
          }, [] as typeof detail.affected_pages)
          .map((page, i) => {
          const isOpen = openIdx === i
          const els = flatElements(page)
          const hasData = els.some(e => e.url || (e.extra && Object.keys(e.extra).length > 0))

          return (
            <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => setOpenIdx(isOpen ? -1 : i)}
                className="w-full flex items-start justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">
                    {page.page_title || 'Page'}
                  </div>
                  <a
                    href={page.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {page.page_url}
                  </a>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                }
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 bg-white">
                  <div className="pt-4 pb-3 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-sm mb-2">{detail.title}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">Priority:</span>
                      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', priorityPill(detail.priority))}>
                        {priorityLabel(detail.priority)}
                      </span>
                    </div>
                    {detail.description && (
                      <p className="text-xs text-gray-600 leading-relaxed">{detail.description}</p>
                    )}
                  </div>

                  {/* Data card */}
                  {hasData && (
                    <div className="mt-3 bg-gray-50 rounded-xl p-3 space-y-2">
                      {savingsLine && (
                        <p className="text-xs text-gray-600">
                          {savingsLine.split(':')[0]}:{' '}
                          <span className="font-bold text-gray-900">{savingsLine.split(':')[1]}</span>
                        </p>
                      )}
                      <ResourceTable els={els} detailsType={detail.details_type ?? null} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Accessibility element view ───────────────────────────────────────────────

function ElementView({ detail }: { detail: IssueRichDetail }) {
  const els: FlatEl[] = detail.affected_pages.flatMap(flatElements)
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const cur = els[idx]

  const wcag = parseWcag(detail.tags ?? [])
  const disabilities = parseDisabilities(detail.tags ?? [])

  const explanation = cur?.extra?.explanation as string | undefined
  const nodeLabel = cur?.extra?.nodeLabel as string | undefined
  const fixLines = explanation
    ? explanation.split('\n').map(l => l.replace(/^[\s•\-]+/, '').trim()).filter(Boolean)
    : []

  function copy() {
    if (!cur?.selector) return
    navigator.clipboard.writeText(cur.selector)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Top section */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-500">Priority:</span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', priorityPill(detail.priority))}>
            {priorityLabel(detail.priority)}
          </span>
          {wcag && (
            <>
              <span className="text-gray-300">|</span>
              <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold">
                WCAG {wcag.level}
              </span>
              {wcag.criterion && (
                <span className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-mono">
                  {wcag.criterion}
                </span>
              )}
            </>
          )}
          {disabilities.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1 text-gray-400 text-[11px]">
                Affects:
                {disabilities.includes('blind') && <span title="Blind"><EyeOff className="w-3.5 h-3.5" /></span>}
                {disabilities.includes('lowVision') && <span title="Low vision"><Eye className="w-3.5 h-3.5" /></span>}
              </span>
            </>
          )}
        </div>
        {detail.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
        )}
      </div>

      {/* Elements split */}
      {els.length > 0 && (
        <div className="flex flex-1 min-h-0 border-t border-gray-50" style={{ height: 'calc(100% - 140px)' }}>
          {/* Left list */}
          <div className="w-52 shrink-0 border-r border-gray-100 overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Elements</span>
              <span className="text-xs text-gray-400">{els.length}</span>
            </div>
            {els.map((el, i) => {
              const label = (el.extra?.nodeLabel as string | undefined) ?? el.selector ?? el.url ?? el.page_url
              return (
                <button key={i} onClick={() => setIdx(i)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-start gap-2 transition-colors',
                    idx === i ? 'border-l-2 border-l-blue-500 bg-blue-50/50' : 'hover:bg-gray-50'
                  )}>
                  <span className={cn(
                    'w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-medium',
                    idx === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  )}>{i + 1}</span>
                  <span className="text-xs text-gray-600 truncate font-mono leading-snug">{label}</span>
                </button>
              )
            })}
          </div>

          {/* Right detail */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Element details</span>
              <span className="text-xs text-gray-400">{idx + 1} of {els.length}</span>
            </div>

            {cur && (
              <>
                {nodeLabel && <p className="text-xs text-gray-500 italic">{nodeLabel}</p>}

                {cur.snippet && (
                  <div className="rounded-lg bg-gray-900 overflow-hidden">
                    <div className="px-3 py-1 bg-gray-800 text-[10px] text-gray-400 font-mono uppercase tracking-wide">HTML</div>
                    <pre className="px-4 py-3 text-[12px] text-green-300 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto">
                      {cur.snippet}
                    </pre>
                  </div>
                )}

                {cur.selector && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">CSS Selector</div>
                        <code className="text-xs text-gray-800 font-mono break-all">{cur.selector}</code>
                      </div>
                      <button onClick={copy}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 shrink-0 transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {fixLines.length > 0 ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Why it's failing</p>
                    <ul className="space-y-1.5">
                      {fixLines.map((line, i) => (
                        <li key={i} className="flex gap-2 text-xs text-amber-900">
                          <span className="shrink-0 text-amber-500">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : detail.description ? (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Why it's failing</p>
                    <p className="text-xs text-gray-600">{detail.description}</p>
                  </div>
                ) : null}

                <div className="text-xs text-gray-400">
                  Page:{' '}
                  <a href={cur.page_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline break-all">{cur.page_url}</a>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── No-data fallback ─────────────────────────────────────────────────────────

function NoneView({ detail }: { detail: IssueRichDetail }) {
  return (
    <div className="flex-1 px-6 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Priority:</span>
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium border', priorityPill(detail.priority))}>
          {priorityLabel(detail.priority)}
        </span>
      </div>
      {detail.description && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">How to fix</p>
          <p className="text-xs text-gray-600">{detail.description}</p>
        </div>
      )}
    </div>
  )
}

// ─── Display mode ─────────────────────────────────────────────────────────────

type Mode = 'element' | 'resource' | 'none'

function getMode(detail: IssueRichDetail): Mode {
  const els = detail.affected_pages.flatMap(p => p.elements)
  if (detail.category === 'accessibility') return 'element'
  const hasSelector = els.some(e => e.selector)
  const hasUrl = els.some(e => e.url)
  if (detail.category === 'performance') return hasUrl ? 'resource' : hasSelector ? 'element' : 'none'
  return hasSelector ? 'element' : hasUrl ? 'resource' : 'none'
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  issueId: string
  onClose: () => void
}

export function IssueDetailPanel({ issueId, onClose }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => getIssueDetail(issueId),
  })

  const mode: Mode = detail ? getMode(detail) : 'none'

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {isLoading
            ? <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
            : <h2 className="text-base font-bold text-gray-900 leading-snug">{detail?.title}</h2>
          }
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0">
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
            {mode === 'resource' && <ResourceAccordionView detail={detail} />}
            {mode === 'element' && <ElementView detail={detail} />}
            {mode === 'none' && <NoneView detail={detail} />}
          </>
        )}
      </div>
    </div>
  )
}
