import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronLeft, ChevronRight, Copy, Check, Eye, EyeOff, Ear } from 'lucide-react'
import { cn } from '../lib/utils'
import { getIssueDetail } from '../api/issues'
import type { IssueRichDetail } from '../types'

// ─── WCAG tag helpers ────────────────────────────────────────────────────────

interface WcagInfo {
  level: string    // "A" | "AA"
  criterion: string | null  // e.g. "4.1.2"
}

function parseWcag(tags: string[]): WcagInfo | null {
  let level: string | null = null
  let criterion: string | null = null

  for (const tag of tags) {
    // Level tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22a, wcag22aa
    const lm = tag.match(/^wcag\d*(aa|a)$/)
    if (lm) level = lm[1].toUpperCase()

    // Criterion tags: wcag111, wcag143, wcag412, wcag1411
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

// Map Lighthouse category tags to impacted user groups
function parseDisabilities(tags: string[]): string[] {
  const out = new Set<string>()
  if (tags.some(t => t.startsWith('cat.text-alt') || t.startsWith('cat.name') || t === 'cat.aria'))
    out.add('blind')
  if (tags.some(t => t === 'cat.color' || t.startsWith('cat.sensory')))
    out.add('lowVision')
  if (tags.some(t => t === 'cat.keyboard'))
    out.add('motor')
  if (tags.some(t => t === 'cat.structure' || t.startsWith('cat.time')))
    out.add('cognitive')
  return [...out]
}

// ─── styling helpers ─────────────────────────────────────────────────────────

function priorityPill(p: string) {
  if (p === 'high') return 'border-orange-300 bg-orange-50 text-orange-700'
  if (p === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-gray-300 bg-gray-50 text-gray-500'
}

const IMPACT_STYLE: Record<string, string> = {
  critical: 'border-red-300 bg-red-50 text-red-700',
  serious:  'border-orange-300 bg-orange-50 text-orange-700',
  moderate: 'border-amber-200 bg-amber-50 text-amber-700',
  minor:    'border-gray-200 bg-gray-50 text-gray-500',
}

function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

// ─── flat element record ─────────────────────────────────────────────────────

interface FlatEl {
  thumbnail: string | null
  selector: string | null
  snippet: string | null
  url: string | null
  extra: Record<string, unknown> | null
  page_url: string
}

function flattenElements(detail: IssueRichDetail): FlatEl[] {
  return detail.affected_pages.flatMap((page) =>
    page.elements.length > 0
      ? page.elements.map((el) => ({ ...el, page_url: page.page_url }))
      : [{ thumbnail: null, selector: null, snippet: null, url: null, extra: null, page_url: page.page_url }]
  )
}

type DisplayMode = 'element' | 'resource' | 'none'

function getDisplayMode(category: string, els: FlatEl[]): DisplayMode {
  if (els.length === 0) return 'none'
  const hasSelector = els.some((e) => e.selector)
  const hasUrl = els.some((e) => e.url)
  if (category === 'accessibility') return 'element'
  if (category === 'performance') return hasUrl ? 'resource' : hasSelector ? 'element' : 'none'
  return hasSelector ? 'element' : hasUrl ? 'resource' : 'none'
}

// ─── Element view (Accessibility / SEO) ────────────────────────────────────

function ElementView({ els, detail }: { els: FlatEl[]; detail: IssueRichDetail }) {
  const [idx, setIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const cur = els[idx]

  function copy() {
    if (!cur?.selector) return
    navigator.clipboard.writeText(cur.selector)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const explanation = cur?.extra?.explanation as string | undefined
  const nodeLabel = cur?.extra?.nodeLabel as string | undefined

  // Split explanation into bullet lines; handle both "•  text" and plain newlines
  const fixLines = explanation
    ? explanation.split('\n').map((l) => l.replace(/^[\s•\-]+/, '').trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: elements list */}
      <div className="w-52 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Elements
          </span>
          <span className="text-xs text-gray-400">{els.length}</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {els.map((el, i) => {
            const label = (el.extra?.nodeLabel as string | undefined)
              ?? el.selector
              ?? el.url
              ?? el.page_url
            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  'w-full text-left px-3 py-2.5 border-b border-gray-50 flex items-start gap-2 transition-colors',
                  idx === i
                    ? 'border-l-2 border-l-blue-500 bg-blue-50/50'
                    : 'hover:bg-gray-50'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-medium',
                  idx === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                )}>
                  {i + 1}
                </span>
                <span className="text-xs text-gray-600 truncate font-mono leading-snug">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: element detail */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Occurrence nav */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">Element details</span>
          <div className="flex items-center gap-0.5 text-xs text-gray-400">
            <span className="mr-1">{idx + 1} of {els.length}</span>
            <button
              onClick={() => setIdx(Math.max(0, idx - 1))}
              disabled={idx === 0}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIdx(Math.min(els.length - 1, idx + 1))}
              disabled={idx === els.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {cur && (
          <>
            {/* Node label */}
            {nodeLabel && (
              <p className="text-xs text-gray-500 font-medium italic">{nodeLabel}</p>
            )}

            {/* HTML snippet — dark DevTools-style code block */}
            {cur.snippet && (
              <div className="rounded-lg bg-gray-900 overflow-hidden">
                <div className="px-3 py-1 bg-gray-800 flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wide">HTML</span>
                </div>
                <pre className="px-4 py-3 text-[12px] text-green-300 font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto">
                  {cur.snippet}
                </pre>
              </div>
            )}

            {/* CSS Selector */}
            {cur.selector && (
              <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">
                      CSS Selector
                    </div>
                    <code className="text-xs text-gray-800 font-mono break-all">{cur.selector}</code>
                  </div>
                  <button
                    onClick={copy}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 shrink-0 transition-colors"
                    title="Copy selector"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Explanation = "Why it's failing" */}
            {fixLines.length > 0 ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">
                  Why it's failing
                </p>
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
                <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                  Why it's failing
                </p>
                <p className="text-xs text-gray-600">{detail.description}</p>
              </div>
            ) : null}

            {/* How to fix — from description */}
            {detail.description && fixLines.length > 0 && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3">
                <p className="text-xs font-semibold text-blue-800 mb-1 uppercase tracking-wide">
                  How to fix
                </p>
                <p className="text-xs text-blue-900">{detail.description}</p>
              </div>
            )}

            {/* Affected page */}
            <div className="text-xs text-gray-400">
              Page:{' '}
              <a href={cur.page_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-500 hover:underline break-all">
                {cur.page_url}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Resource view (Performance) ─────────────────────────────────────────────

function ResourceView({ els, detail }: { els: FlatEl[]; detail: IssueRichDetail }) {
  const rows = els.filter((e) => e.url)
  const hasWastedBytes = rows.some((e) => e.extra?.wastedBytes != null)
  const hasWastedMs = rows.some((e) => e.extra?.wastedMs != null)
  const hasTotalBytes = rows.some((e) => e.extra?.totalBytes != null)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">Resource</th>
              {hasTotalBytes && (
                <th className="text-right px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                  Transfer Size
                </th>
              )}
              {(hasWastedBytes || hasWastedMs) && (
                <th className="text-right px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                  {hasWastedMs ? 'Potential Savings' : 'Wasted'}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((el, i) => {
              const label = el.extra?.label as string | undefined
              return (
                <tr key={i} className={cn('border-b border-gray-100', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                  <td className="px-3 py-2.5 max-w-xs">
                    {label && <div className="text-gray-400 text-[10px] mb-0.5">{label}</div>}
                    <a href={el.url!} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-mono break-all">
                      {el.url}
                    </a>
                  </td>
                  {hasTotalBytes && (
                    <td className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap font-mono">
                      {fmtBytes(el.extra?.totalBytes as number | undefined)}
                    </td>
                  )}
                  {(hasWastedBytes || hasWastedMs) && (
                    <td className="px-3 py-2.5 text-right whitespace-nowrap font-mono">
                      <span className="text-orange-600 font-medium">
                        {hasWastedMs
                          ? fmtMs(el.extra?.wastedMs as number | undefined)
                          : fmtBytes(el.extra?.wastedBytes as number | undefined)
                        }
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows[0] && (
        <div className="text-xs text-gray-400">
          Page:{' '}
          <a href={rows[0].page_url} target="_blank" rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all">
            {rows[0].page_url}
          </a>
        </div>
      )}
      {detail.description && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">How to fix</p>
          <p className="text-xs text-gray-600">{detail.description}</p>
        </div>
      )}
    </div>
  )
}

// ─── No-element fallback ─────────────────────────────────────────────────────

function NoneView({ detail }: { detail: IssueRichDetail }) {
  return (
    <div className="flex-1 px-6 py-5 space-y-4">
      {detail.description && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
          <p className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">How to fix</p>
          <p className="text-xs text-gray-600">{detail.description}</p>
        </div>
      )}
      {detail.affected_pages.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Affected pages:</p>
          <ul className="space-y-1">
            {detail.affected_pages.map((p, i) => (
              <li key={i}>
                <a href={p.page_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline">
                  {p.page_url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
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

  const els: FlatEl[] = detail ? flattenElements(detail) : []
  const mode: DisplayMode = detail ? getDisplayMode(detail.category, els) : 'none'

  const wcag = detail?.tags ? parseWcag(detail.tags) : null
  const disabilities = detail?.tags ? parseDisabilities(detail.tags) : []

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-gray-200">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {isLoading
            ? <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
            : <h2 className="text-base font-bold text-gray-900 leading-snug">{detail?.title}</h2>
          }
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors shrink-0"
          >
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
            {/* Meta row — matches production app layout */}
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-x-3 gap-y-2 shrink-0">

              {/* WCAG badge */}
              {wcag && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold tracking-wide">
                    WCAG {wcag.level}
                  </span>
                  {wcag.criterion && (
                    <span className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-mono">
                      {wcag.criterion}
                    </span>
                  )}
                </div>
              )}

              {/* Divider */}
              {wcag && <span className="text-gray-200 text-sm">|</span>}

              {/* Impact level (from Lighthouse) */}
              {detail.impact && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize',
                  IMPACT_STYLE[detail.impact] ?? 'border-gray-200 bg-gray-50 text-gray-500'
                )}>
                  {detail.impact}
                </span>
              )}

              {/* Priority */}
              <span className={cn(
                'px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize',
                priorityPill(detail.priority)
              )}>
                {detail.priority} priority
              </span>

              {/* Affected user icons — derived from Lighthouse category tags */}
              {disabilities.length > 0 && (
                <>
                  <span className="text-gray-200 text-sm">|</span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    Affects:
                    {disabilities.includes('blind') && (
                      <span title="Blind users"><EyeOff className="w-3.5 h-3.5 text-gray-500" /></span>
                    )}
                    {disabilities.includes('lowVision') && (
                      <span title="Low vision users"><Eye className="w-3.5 h-3.5 text-gray-500" /></span>
                    )}
                    {disabilities.includes('cognitive') && (
                      <span title="Cognitive disabilities" className="text-gray-500 text-[11px] font-medium">A</span>
                    )}
                    {disabilities.includes('motor') && (
                      <span title="Motor/keyboard users"><Ear className="w-3.5 h-3.5 text-gray-500" /></span>
                    )}
                  </span>
                </>
              )}

              {/* display_value pill */}
              {detail.display_value && (
                <>
                  <span className="text-gray-200 text-sm">|</span>
                  <span className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600 text-[11px] font-mono">
                    {detail.display_value}
                  </span>
                </>
              )}
            </div>

            {/* Body */}
            {mode === 'element' && <ElementView els={els} detail={detail} />}
            {mode === 'resource' && <ResourceView els={els} detail={detail} />}
            {mode === 'none' && <NoneView detail={detail} />}
          </>
        )}
      </div>
    </div>
  )
}
