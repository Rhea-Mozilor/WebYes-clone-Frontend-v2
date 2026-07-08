import React, { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Eye, EyeOff, Brain, ExternalLink, Copy } from 'lucide-react'
import { cn } from '../lib/utils'
import { PriorityBadge } from './ui/PriorityBadge'
import { getIssueDetail, getAccessibilityIssueDetail } from '../api/issues'
import type { IssueRichDetail, IssueAffectedPage, IssueElement, BoundingRect, IssueOccurrence } from '../types'

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


function parseWcag(tags: string[]): { version: string; level: string; criterion: string | null } | null {
  let version = '2.0'
  let level: string | null = null
  let criterion: string | null = null
  for (const tag of tags) {
    if (/^wcag21/.test(tag)) version = '2.1'
    if (/^wcag3/.test(tag)) version = '3.0'
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
  return level || criterion ? { version, level: level ?? '', criterion } : null
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

interface FlatEl extends IssueElement {
  page_url: string
}

function flatElements(page: IssueAffectedPage): FlatEl[] {
  const elements = page.elements ?? []
  return elements.map(el => ({ ...el, page_url: page.page_url }))
}

// ─── List-section helpers (network-tree, text, etc.) ─────────────────────────

interface ChainNode {
  url: string
  children?: Record<string, ChainNode>
  isLongest?: boolean
  transferSize?: number
  navStartToEndTime?: number
}

function ChainItem({ node, depth = 0 }: { node: ChainNode; depth?: number }) {
  const hasChildren = node.children && Object.keys(node.children).length > 0
  const [open, setOpen] = useState(true)
  return (
    <div>
      <div className="flex items-start gap-2 py-1" style={{ paddingLeft: depth * 20 }}>
        {depth > 0 && <span className="text-gray-300 shrink-0 font-mono text-[10px] mt-0.5">└─</span>}
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 min-w-0 flex-1 text-left group"
          >
            {open
              ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
              : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
            }
            <span className="text-xs font-mono text-blue-700 break-all leading-snug group-hover:underline">{node.url}</span>
          </button>
        ) : (
          <span className="text-xs font-mono text-blue-700 break-all flex-1 leading-snug">{node.url}</span>
        )}
        <div className="flex items-center gap-2 shrink-0 text-[10px] text-gray-500 whitespace-nowrap">
          {node.transferSize != null && <span>{fmtBytes(node.transferSize)}</span>}
          {node.navStartToEndTime != null && <span>{fmtMs(node.navStartToEndTime)}</span>}
          {node.isLongest && (
            <span className="text-green-700 font-semibold bg-green-50 px-1.5 py-0.5 rounded">longest</span>
          )}
        </div>
      </div>
      {hasChildren && open && Object.values(node.children!).map((child, i) => (
        <ChainItem key={i} node={child as ChainNode} depth={depth + 1} />
      ))}
    </div>
  )
}

function ListSectionsView({ els }: { els: FlatEl[] }) {
  const sections = els.filter(e => {
    const v = e.extra?.value
    return v && typeof v === 'object' && (v as Record<string, unknown>).type != null
  })
  if (sections.length === 0) return null

  return (
    <div className="space-y-3">
      {sections.map((el, i) => {
        const val = el.extra?.value as Record<string, unknown>
        const title = el.extra?.title as string | undefined
        const desc = el.extra?.description as string | undefined

        if (val.type === 'network-tree') {
          const chains = val.chains as Record<string, ChainNode> | undefined
          const longest = (val.longestChain as Record<string, unknown> | undefined)?.duration
          return (
            <div key={i} className="rounded-lg border border-[#CBD2E1] overflow-hidden">
              <div className="px-4 py-2.5 bg-[#EEF2F5] border-b border-[#CBD2E1] flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">Network dependency chain</span>
                {longest != null && (
                  <span className="text-[10px] text-gray-500">Longest chain: {fmtMs(longest as number)}</span>
                )}
              </div>
              <div className="p-3 divide-y divide-gray-100 bg-white">
                {chains && Object.values(chains).map((chain, j) => (
                  <ChainItem key={j} node={chain} />
                ))}
              </div>
            </div>
          )
        }

        if (val.type === 'text') {
          return (
            <div key={i} className="rounded-lg border border-[#CBD2E1] bg-white p-3">
              {title && <p className="text-xs font-semibold text-gray-700 mb-1">{title}</p>}
              <p className="text-xs text-gray-600">{val.value as string}</p>
              {desc && (
                <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                  {(desc as string).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}
                </p>
              )}
            </div>
          )
        }

        // Generic fallback: show title + JSON
        return title ? (
          <div key={i} className="rounded-lg border border-[#CBD2E1] bg-white p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">{title}</p>
            {desc && <p className="text-[10px] text-gray-400 leading-snug">{desc}</p>}
          </div>
        ) : null
      })}
    </div>
  )
}

// ─── Resource data table ──────────────────────────────────────────────────────

function ResourceTable({ els, detailsType }: { els: FlatEl[]; detailsType: string | null }) {
  // Exclude list-section items (handled by ListSectionsView)
  const rows = els.filter(e => {
    const valType = (e.extra?.value as Record<string, unknown> | undefined)?.type
    if (valType) return false
    return e.url || (e.extra && Object.keys(e.extra).length > 0)
  })
  if (rows.length === 0) return null

  const hasUrl = rows.some(e => e.url)
  const hasTotal = rows.some(e => e.extra?.totalBytes != null)
  const hasWastedBytes = rows.some(e => e.extra?.wastedBytes != null)
  const hasWastedMs = rows.some(e => e.extra?.wastedMs != null)
  const hasDuration = rows.some(e => e.extra?.duration != null)
  const hasLongest = rows.some(e => e.extra?.isLongest != null)
  const hasSource = rows.some(e => typeof e.extra?.source === 'string')
  const hasDescription = rows.some(e => typeof e.extra?.description === 'string')
  const hasSourceLoc = rows.some(e => !!(e.extra?.sourceLocation as Record<string, unknown> | undefined)?.url)

  const noColumns = !hasUrl && !hasTotal && !hasWastedBytes && !hasWastedMs && !hasDuration && !hasLongest && !hasSource && !hasDescription && !hasSourceLoc
  if (noColumns) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-[#CBD2E1] bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#CBD2E1]">
            {hasSource && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">Source</th>}
            {hasUrl && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">
              {detailsType === 'criticalrequestchain' ? 'Resource' : 'URL'}
            </th>}
            {hasSourceLoc && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">Location</th>}
            {hasDescription && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">Description</th>}
            {hasTotal && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">Transfer Size</th>}
            {hasDuration && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">Duration</th>}
            {(hasWastedBytes || hasWastedMs) && (
              <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">Est Savings</th>
            )}
            {hasLongest && <th className="px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">Longest Path</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((el, i) => {
            const srcLoc = el.extra?.sourceLocation as Record<string, unknown> | undefined
            const srcUrl = srcLoc?.url as string | undefined
            const srcLine = srcLoc?.line as number | undefined
            const srcCol = srcLoc?.column as number | undefined
            const locLabel = srcUrl
              ? `${srcUrl}${srcLine ? `:${srcLine}` : ''}${srcCol ? `:${srcCol}` : ''}`
              : null
            return (
              <tr key={i} className="border-b border-[#CBD2E1] last:border-0">
                {hasSource && (
                  <td className="px-4 py-3 align-middle">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-600 uppercase tracking-wide">
                      {String(el.extra?.source ?? '—')}
                    </span>
                  </td>
                )}
                {hasUrl && (
                  <td className="px-4 py-4 align-middle">
                    {!!el.extra?.label && (
                      <div className="text-[10px] text-gray-400 mb-0.5">{String(el.extra.label)}</div>
                    )}
                    <div className="flex items-center gap-2 min-w-[260px]">
                      <a href={el.url!} target="_blank" rel="noopener noreferrer"
                        className="text-blue-700 underline break-all">
                        {el.url}
                      </a>
                    </div>
                  </td>
                )}
                {hasSourceLoc && (
                  <td className="px-4 py-3 align-middle max-w-[200px]">
                    {srcUrl
                      ? <a href={srcUrl} target="_blank" rel="noopener noreferrer"
                          className="text-blue-700 underline break-all text-[10px]"
                          title={locLabel ?? undefined}>
                          {locLabel}
                        </a>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                )}
                {hasDescription && (
                  <td className="px-4 py-3 align-middle text-gray-700 leading-snug">
                    {String(el.extra?.description ?? '—')}
                  </td>
                )}
                {hasTotal && (
                  <td className="px-4 py-4 align-middle text-gray-700 whitespace-nowrap">
                    {fmtBytes(el.extra?.totalBytes as number | undefined)}
                  </td>
                )}
                {hasDuration && (
                  <td className="px-4 py-4 align-middle text-gray-700 whitespace-nowrap">
                    {fmtMs(el.extra?.duration as number | undefined)}
                  </td>
                )}
                {(hasWastedBytes || hasWastedMs) && (
                  <td className="px-4 py-4 align-middle whitespace-nowrap">
                    <span className="font-medium text-gray-700">
                      {hasWastedMs
                        ? fmtMs(el.extra?.wastedMs as number | undefined)
                        : fmtBytes(el.extra?.wastedBytes as number | undefined)}
                    </span>
                  </td>
                )}
                {hasLongest && (
                  <td className="px-4 py-4 align-middle">
                    {!!el.extra?.isLongest && (
                      <span className="inline-block text-[11px] font-semibold text-green-800 bg-green-100 rounded px-2 py-0.5">Longest</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Collapsible section (Why this matters / What we recommend) ───────────────

function SectionAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open
          ? <ChevronUp className="w-[18px] h-[18px] text-gray-600 shrink-0" />
          : <ChevronDown className="w-[18px] h-[18px] text-gray-600 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── SubItems table (items with subItems: {type:"subitems", items:[...]}) ──────

function SubItemsTable({ rawItems }: { rawItems: Record<string, unknown>[] }) {
  type Row = { parentUrl?: string; error?: string; signal?: string; label?: string; [k: string]: unknown }
  const rows: Row[] = []

  for (const item of rawItems) {
    const parentUrl = item.url as string | undefined
    const sub = item.subItems as { type?: string; items?: Record<string, unknown>[] } | undefined
    if (sub?.type === 'subitems' && Array.isArray(sub.items) && sub.items.length > 0) {
      for (const s of sub.items) {
        rows.push({ parentUrl, ...s })
      }
    }
  }

  if (rows.length === 0) return null

  const hasParentUrl = rows.some(r => !!r.parentUrl)
  const hasError = rows.some(r => typeof r.error === 'string')
  const hasSignal = rows.some(r => typeof r.signal === 'string')
  const hasLabel = rows.some(r => typeof r.label === 'string')
  const hasRowUrl = rows.some(r => typeof r.url === 'string')

  if (!hasParentUrl && !hasError && !hasSignal && !hasLabel && !hasRowUrl) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-[#CBD2E1] bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#CBD2E1]">
            {hasParentUrl && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">URL</th>}
            {hasRowUrl && !hasParentUrl && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">URL</th>}
            {hasLabel && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">Label</th>}
            {(hasError || hasSignal) && <th className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold">Details</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[#CBD2E1] last:border-0">
              {(hasParentUrl || (hasRowUrl && !hasParentUrl)) && (
                <td className="px-4 py-3 align-middle max-w-[320px]">
                  {(row.parentUrl ?? row.url as string | undefined) ? (
                    <a href={(row.parentUrl ?? row.url as string)} target="_blank" rel="noopener noreferrer"
                      className="text-blue-700 underline break-all">
                      {row.parentUrl ?? row.url as string}
                    </a>
                  ) : <span className="text-gray-400">—</span>}
                </td>
              )}
              {hasLabel && (
                <td className="px-4 py-3 align-middle text-gray-700">{String(row.label ?? '—')}</td>
              )}
              {(hasError || hasSignal) && (
                <td className="px-4 py-3 align-middle text-gray-700 leading-snug">
                  {String(row.error ?? row.signal ?? '—')}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Lighthouse dynamic table (type:"table" with headings+items) ──────────────

interface LHTableSection {
  headings: Array<{ key: string; label: string; valueType: string }>
  items: Record<string, unknown>[]
}

function formatLHCell(value: unknown, valueType: string): React.ReactNode {
  if (value == null) return '—'
  if (valueType === 'ms' && typeof value === 'number') return `${value.toFixed(0)} ms`
  if (valueType === 'bytes' && typeof value === 'number') return fmtBytes(value)
  if ((valueType === 'url' || valueType === 'link') && typeof value === 'string' && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-all font-mono text-[10px]">
        {value}
      </a>
    )
  }
  if (valueType === 'source-location') {
    const v = value as Record<string, unknown>
    if (v.type === 'text') return <span className="text-gray-500 italic">{String(v.value ?? '—')}</span>
    if (v.type === 'source-location' && v.url) {
      const url = v.url as string
      const line = v.line as number | undefined
      const col = v.column as number | undefined
      const filename = url.split('/').pop() ?? url
      const label = `${filename}${line != null ? `:${line}` : ''}${col != null ? `:${col}` : ''}`
      return (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-blue-600 hover:underline font-mono" title={url}>
          {label}
        </a>
      )
    }
    return String(value)
  }
  return String(value)
}

function LighthouseTableView({ sections }: { sections: LHTableSection[] }) {
  if (!sections.length) return null
  return (
    <div className="space-y-3">
      {sections.map((sec, si) => (
        <div key={si} className="overflow-x-auto rounded-lg border border-[#CBD2E1] bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#CBD2E1]">
                {sec.headings.map(h => (
                  <th key={h.key} className="text-left px-4 py-3 bg-[#EEF2F5] text-gray-600 font-semibold whitespace-nowrap">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sec.items.map((row, ri) => (
                <tr key={ri} className="border-b border-[#CBD2E1] last:border-0">
                  {sec.headings.map(h => (
                    <td key={h.key} className="px-4 py-2.5 text-gray-700 align-top">
                      {formatLHCell(row[h.key], h.valueType)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ─── Page accordions for resource/table data (performance, seo, quality) ─────

function ResourcePages({ detail }: { detail: IssueRichDetail }) {
  const [openIdx, setOpenIdx] = useState<number>(0)

  const pages = (detail.affected_pages ?? []).reduce((acc, page) => {
    const existing = acc.find(p => p.page_url === page.page_url)
    if (existing) {
      existing.elements.push(...(page.elements ?? []))
    } else {
      acc.push({ ...page, elements: [...(page.elements ?? [])] })
    }
    return acc
  }, [] as typeof detail.affected_pages)

  if (pages.length === 0) return null

  const savingsLine = (() => {
    if (detail.wasted_ms != null) return `Potential time savings: ${fmtMs(detail.wasted_ms)}`
    if (detail.wasted_bytes != null) return `Estimated total savings: ${fmtBytes(detail.wasted_bytes)}`
    return null
  })()

  return (
    <div className="px-6 pb-6 space-y-3">
      {pages.map((page, i) => {
        const isOpen = openIdx === i
        const fromPage = flatElements(page)
        // Fallback: if the page has no elements (old backend data), read from
        // the raw details.items stored on the issue row directly.
        const rawItems = (page.details?.items ?? detail.details?.items ?? []) as Record<string, unknown>[]
        const lhTables: LHTableSection[] = rawItems
          .filter(item => item.type === 'table' && Array.isArray(item.headings) && Array.isArray(item.items))
          .map(item => ({ headings: item.headings as LHTableSection['headings'], items: item.items as Record<string, unknown>[] }))
        const subItemsRaw = rawItems.filter(item => {
          const sub = item.subItems as { type?: string; items?: unknown[] } | undefined
          return sub?.type === 'subitems' && Array.isArray(sub.items) && sub.items.length > 0
        })
        const els: FlatEl[] = fromPage.length > 0 ? fromPage : (() => {
          const result: FlatEl[] = []
          for (const item of rawItems) {
            if (item.type === 'table') continue  // handled by LighthouseTableView
            if (item.type === 'list-section' && Array.isArray(item.items)) {
              // Expand list-section inner items into ListSectionsView-compatible FlatEls
              for (const inner of item.items as Record<string, unknown>[]) {
                const innerType = inner.type as string | undefined
                const innerValue = inner.value
                result.push({
                  thumbnail: null,
                  selector: null,
                  snippet: null,
                  url: null,
                  extra: innerType != null ? {
                    value: {
                      type: innerType,
                      ...(innerValue && typeof innerValue === 'object'
                        ? innerValue as Record<string, unknown>
                        : { value: innerValue }),
                    },
                  } : null,
                  page_url: page.page_url,
                })
              }
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { type: _t, url: itemUrl, scriptUrl, requestUrl, node: _n, selector, snippet, ...rest } = item
              result.push({
                thumbnail: null,
                selector: (selector as string | undefined) ?? null,
                snippet: (snippet as string | undefined) ?? null,
                url: (itemUrl as string | undefined) ?? (scriptUrl as string | undefined) ?? (requestUrl as string | undefined) ?? null,
                extra: Object.keys(rest).length > 0 ? rest as Record<string, unknown> : null,
                page_url: page.page_url,
              })
            }
          }
          return result
        })()
        const hasTableData = els.some(e => {
          const valType = (e.extra?.value as Record<string, unknown> | undefined)?.type
          if (valType) return false
          return e.url || (e.extra && Object.keys(e.extra).length > 0)
        })
        const hasSections = els.some(e => {
          const v = e.extra?.value
          return v != null && typeof v === 'object' && (v as Record<string, unknown>).type != null
        })
        const hasData = hasTableData || hasSections || lhTables.length > 0 || subItemsRaw.length > 0

        return (
          <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setOpenIdx(isOpen ? -1 : i)}
              className="w-full flex items-start justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 text-sm">{page.page_title || 'Page'}</div>
                <a href={page.page_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-xs text-blue-600 hover:underline break-all">
                  {page.page_url}
                </a>
              </div>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              }
            </button>

            {isOpen && (
              <div className="px-4 pb-4 bg-white">
                <div className="pt-4 pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{detail.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">Priority:</span>
                    <PriorityBadge priority={detail.priority} />
                  </div>
                  {detail.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {detail.learn_more_url ? (
                        <>
                          <a href={detail.learn_more_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 underline">
                            {detail.audit_title || detail.title}
                          </a>{' '}
                          {detail.description}
                        </>
                      ) : detail.description}
                    </p>
                  )}
                </div>

                {hasData && (
                  <div className="bg-[#F7F9FC] pt-5 px-[22px] pb-5 mt-4 -mx-4 -mb-4 rounded-b-lg space-y-3">
                    {lhTables.length > 0 && <LighthouseTableView sections={lhTables} />}
                    {subItemsRaw.length > 0 && <SubItemsTable rawItems={subItemsRaw} />}
                    {hasTableData && (
                      <div className="bg-white border border-[#CBD2E1] rounded-lg overflow-auto">
                        {savingsLine && (
                          <div className="p-4 border-b border-[#CBD2E1]">
                            <p className="text-sm text-gray-700">
                              {savingsLine.split(':')[0]}:{' '}
                              <span className="font-semibold text-gray-900">{savingsLine.split(':')[1]}</span>
                            </p>
                          </div>
                        )}
                        <ResourceTable els={els} detailsType={detail.details_type ?? null} />
                      </div>
                    )}
                    <ListSectionsView els={els} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Element inspector (accessibility) ───────────────────────────────────────

interface ElEntry {
  selector: string | null
  snippet: string | null
  thumbnail: string | null
  screenshot: string | null
  page_url: string
  nodeLabel: string | undefined
  explanation: string | undefined
  boundingRect: BoundingRect | undefined
  fix_suggestion: string | null
}

function buildElEntries(detail: IssueRichDetail): ElEntry[] {
  // Build a page_url → screenshot map (prefer full-page, fall back to thumbnail)
  const pageScreenMap = new Map<string, string>()
  for (const page of detail.affected_pages ?? []) {
    const shot = page.screenshot_full_page ?? page.screenshot ?? null
    if (shot && page.page_url) pageScreenMap.set(page.page_url, shot)
  }
  const defaultShot = detail.affected_pages?.[0]?.screenshot_full_page
    ?? detail.affected_pages?.[0]?.screenshot ?? null

  // 1. occurrences array (from /accessibility-detail endpoint)
  if (detail.occurrences && detail.occurrences.length > 0) {
    return detail.occurrences.map((occ: IssueOccurrence) => ({
      selector: occ.issue_node?.selector ?? occ.selector ?? null,
      snippet: occ.issue_node?.snippet ?? occ.snippet ?? null,
      thumbnail: null,
      screenshot: pageScreenMap.get(occ.page_url) ?? defaultShot,
      page_url: occ.page_url,
      nodeLabel: occ.issue_node?.nodeLabel,
      explanation: undefined,
      boundingRect: occ.issue_node?.boundingRect,
      fix_suggestion: occ.fix_suggestion ?? null,
    }))
  }

  // 2. Flat nodes array (older API)
  if (detail.nodes && detail.nodes.length > 0) {
    return detail.nodes.map(n => ({
      selector: n.selector,
      snippet: n.snippet ?? null,
      thumbnail: n.thumbnail ?? null,
      screenshot: pageScreenMap.get(n.page_url) ?? defaultShot,
      page_url: n.page_url,
      nodeLabel: n.issue_node?.nodeLabel,
      explanation: n.issue_node?.explanation,
      boundingRect: n.issue_node?.boundingRect,
      fix_suggestion: null,
    }))
  }

  // 3. affected_pages.elements (newer backend)
  const fromPages = (detail.affected_pages ?? []).flatMap(page =>
    (page.elements ?? []).map(el => {
      const node = el.extra?.issue_node as Record<string, unknown> | undefined
      const br = el.extra?.boundingRect as BoundingRect | undefined
      return {
        selector: el.selector ?? (el.extra?.selector as string | undefined) ?? null,
        snippet: el.snippet ?? (el.extra?.snippet as string | undefined) ?? null,
        thumbnail: el.thumbnail,
        screenshot: pageScreenMap.get(page.page_url) ?? defaultShot,
        page_url: page.page_url,
        nodeLabel: (el.extra?.nodeLabel as string | undefined) ?? (node?.nodeLabel as string | undefined),
        explanation: (el.extra?.explanation as string | undefined) ?? (node?.explanation as string | undefined),
        boundingRect: br,
        fix_suggestion: null,
      }
    })
  )
  if (fromPages.length > 0) return fromPages

  // 4. Fallback: raw Lighthouse details.items
  const pageUrl = detail.affected_pages?.[0]?.page_url ?? ''
  const rawItems = (detail.details?.items ?? []) as Record<string, unknown>[]
  return rawItems.map(item => {
    const node = (item.node ?? {}) as Record<string, unknown>
    const br = (node.boundingRect ?? item.boundingRect) as BoundingRect | undefined
    return {
      selector: (node.selector ?? item.selector ?? node.nodeLabel ?? null) as string | null,
      snippet: (node.snippet ?? item.snippet ?? null) as string | null,
      thumbnail: null,
      screenshot: defaultShot,
      page_url: (item.url as string | undefined) ?? pageUrl,
      nodeLabel: (node.nodeLabel ?? item.nodeLabel) as string | undefined,
      explanation: (node.explanation ?? item.explanation) as string | undefined,
      boundingRect: br,
      fix_suggestion: null,
    }
  })
}

// ─── Element preview: page wireframe with element position highlighted ────────

function toImgSrc(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return ''
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/jpeg;base64,${raw}`
}

function ElementPreview({ el }: { el: ElEntry }) {
  // We need the image's natural width to compute background-size correctly.
  // Without it, hardcoding PAGE_W=1280 breaks mobile screenshots (828px wide etc).
  const [naturalW, setNaturalW] = useState<number | null>(null)

  const br = el.boundingRect
  const rawSrc = (typeof el.screenshot === 'string' && el.screenshot)
    ? el.screenshot
    : (typeof el.thumbnail === 'string' && el.thumbnail)
      ? el.thumbnail
      : null
  const src = rawSrc ? toImgSrc(rawSrc) : ''

  const CONTAINER_W = 130
  const CONTAINER_H = 82
  const PAD = 50

  if (!src) {
    return (
      <svg viewBox={`0 0 ${CONTAINER_W} ${CONTAINER_H}`} width={CONTAINER_W} height={CONTAINER_H}>
        <rect width={CONTAINER_W} height={CONTAINER_H} fill="#f8fafc" />
        <rect width={CONTAINER_W} height="7" fill="#e2e8f0" />
        {[10, 14, 19, 25, 29, 35, 39, 45, 50, 55, 60, 65, 70].map((y, i) => (
          <rect key={i} x="6" y={y} width={[40, 65, 50, 70, 45, 60, 75, 55, 35, 65, 48, 55, 40][i]} height="2" rx="1" fill="#e2e8f0" />
        ))}
      </svg>
    )
  }

  // Hidden img to read natural dimensions on load; browser caches it
  const hiddenImg = (
    <img
      src={src}
      alt=""
      style={{ display: 'none', position: 'absolute' }}
      onLoad={e => setNaturalW((e.target as HTMLImageElement).naturalWidth)}
    />
  )

  if (!br) {
    return (
      <div className="relative w-full h-full" style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${CONTAINER_W}px auto`,
        backgroundPosition: '0 0',
      }}>
        {hiddenImg}
      </div>
    )
  }

  const cropX = Math.max(0, br.left - PAD)
  const cropY = Math.max(0, br.top  - PAD)
  const cropW = br.width  + PAD * 2
  const cropH = br.height + PAD * 2
  const scale = Math.min(CONTAINER_W / cropW, CONTAINER_H / cropH)

  // Use actual natural width once known; fall back to br.right+PAD (minimum
  // possible image width that still contains the element) until load fires.
  const imgNatW = naturalW ?? (br.right + PAD)
  const imgRenderW = imgNatW * scale

  const hlLeft = (br.left - cropX) * scale
  const hlTop  = (br.top  - cropY) * scale
  const hlW    = Math.max(br.width  * scale, 3)
  const hlH    = Math.max(br.height * scale, 3)

  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${imgRenderW}px auto`,
        backgroundPosition: `-${cropX * scale}px -${cropY * scale}px`,
      }}
    >
      {hiddenImg}
      <div
        style={{
          position: 'absolute',
          left: hlLeft,
          top: hlTop,
          width: hlW,
          height: hlH,
          border: '2px solid #ef4444',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

function FixSuggestion({ text }: { text: string }) {
  if (!text.trim()) return null
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null
  const intro = lines[0]
  const bullets = lines.slice(1)
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {intro && <p className="text-sm text-gray-700 mb-3">{intro}</p>}
      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InspectorIcon() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 h-4 shrink-0" fill="none">
      <rect x="1" y="1" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 4.5h16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11.5l1.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 16.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 12v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ─── Full-page screenshot lightbox ───────────────────────────────────────────

function ScreenshotModal({ el, onClose }: { el: ElEntry; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const br = el.boundingRect
  const src = el.screenshot ? toImgSrc(el.screenshot)
    : el.thumbnail ? toImgSrc(el.thumbnail)
    : ''

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll to show the highlighted element when modal opens
  useEffect(() => {
    if (!containerRef.current || !br) return
    // Image is rendered at its natural width (full size), page coord space = 1:1
    // Scroll so element is roughly centered vertically
    const scrollTarget = Math.max(0, br.top - 200)
    containerRef.current.scrollTop = scrollTarget
  }, [br])

  // Highlight in full-size coordinates (image renders 1:1 with natural px)
  // We render the img at 100% of its natural size → scale = 1
  const ex = br?.left ?? null
  const ey = br?.top ?? null
  const ew = br ? Math.max(br.width, 4) : null
  const eh = br ? Math.max(br.height, 4) : null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl flex flex-col"
        style={{ maxWidth: '90vw', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar — never scrolls, close button always visible */}
        <div className="shrink-0 flex items-center justify-end px-3 py-2">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 flex items-center justify-center shadow-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable screenshot area */}
        <div ref={containerRef} className="overflow-auto flex-1">
          <div className="relative" style={{ display: 'inline-block' }}>
            {src ? (
              <>
                <img
                  src={src}
                  alt="Page screenshot"
                  style={{ display: 'block', maxWidth: 'none' }}
                />
                {ex !== null && ey !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      left: ex,
                      top: ey,
                      width: ew!,
                      height: eh!,
                      border: '3px solid #ef4444',
                      boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center w-96 h-64 text-gray-400 text-sm">
                No screenshot available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AccessibilityElementsView({ detail }: { detail: IssueRichDetail }) {
  const els = buildElEntries(detail)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const total = els.length
  const selected = els[selectedIdx] ?? null

  return (
    <div className="flex-1 flex overflow-hidden border-t border-gray-100">
      {/* ── Left: Elements list ── */}
      <div className="w-[220px] shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
        <div className="px-4 py-3 shrink-0 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Elements list</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {els.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center">No elements found</p>
          ) : (
            els.map((el, i) => {
              const label = el.selector ?? el.nodeLabel ?? '—'
              const isSelected = i === selectedIdx
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-left border-l-[3px] transition-colors',
                    isSelected
                      ? 'border-l-[#0b66e4] bg-blue-50/40'
                      : 'border-l-transparent hover:bg-gray-50'
                  )}
                >
                  <span className="text-xs text-gray-700 font-mono truncate flex-1 mr-2">{label}</span>
                  <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-gray-600 text-white text-[10px] flex items-center justify-center font-semibold leading-none">1</span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: Element details ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select an element from the list
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Element details</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>Occurrence {selectedIdx + 1} of {total}</span>
                <button
                  onClick={() => setSelectedIdx(prev => Math.max(0, prev - 1))}
                  disabled={selectedIdx === 0}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedIdx(prev => Math.min(total - 1, prev + 1))}
                  disabled={selectedIdx === total - 1}
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Element card */}
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 flex gap-3">
                {/* Thumbnail / screenshot */}
                <div
                  className="w-[130px] h-[82px] rounded-md overflow-hidden border border-gray-200 shrink-0 bg-gray-100 cursor-zoom-in"
                  onClick={() => setShowScreenshot(true)}
                  title="Click to view full screenshot"
                >
                  <ElementPreview el={selected} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs text-gray-500 shrink-0">Selector:</span>
                    <code className="text-xs font-mono text-gray-800 break-all leading-snug flex-1">
                      {selected.selector ?? selected.nodeLabel ?? '—'}
                    </code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(selected.selector ?? selected.nodeLabel ?? '')}
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy selector"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">Affected page:</span>
                    <a
                      href={selected.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0b66e4] hover:underline break-all flex-1 leading-snug"
                    >
                      {selected.page_url}
                    </a>
                    <a
                      href={selected.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {selected.explanation && (
                    <p className="text-xs text-amber-700 leading-snug">{selected.explanation}</p>
                  )}
                </div>
              </div>

              {/* Fix suggestion */}
              {selected.fix_suggestion && <FixSuggestion text={selected.fix_suggestion} />}
            </div>
          </>
        )}
      </div>

      {/* Full-page screenshot lightbox */}
      {showScreenshot && selected && (
        <ScreenshotModal el={selected} onClose={() => setShowScreenshot(false)} />
      )}
    </div>
  )
}

// ─── Accessibility metadata row ───────────────────────────────────────────────

function AccessibilityMeta({ detail }: { detail: IssueRichDetail }) {
  // If the backend returned wcag_version/wcag_criterion directly, use them
  // to derive a wcag object without needing tags.
  const wcagFromTags = parseWcag(detail.tags ?? [])
  const directLevel = detail.conformance_level ?? null
  const wcag = wcagFromTags
    ? { ...wcagFromTags, level: wcagFromTags.level || directLevel || '' }
    : (detail.wcag_version || detail.wcag_criterion || directLevel)
      ? { version: detail.wcag_version ?? '2.0', level: directLevel ?? '', criterion: detail.wcag_criterion ?? null }
      : null
  const disabilities = parseDisabilities(detail.tags ?? [])

  return (
    <div className="px-6 pt-4 pb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-100">
      {wcag && (
        <>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            WCAG {wcag.version}{wcag.criterion ? ` ${wcag.criterion}` : ''}
          </span>
          <span className="text-gray-300 text-sm">|</span>
        </>
      )}

      {disabilities.length > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Affected users:</span>
            {disabilities.includes('blind') && <EyeOff className="w-4 h-4 text-gray-500" title="Blind users" />}
            {disabilities.includes('lowVision') && <Eye className="w-4 h-4 text-gray-500" title="Low vision users" />}
            {disabilities.includes('cognitive') && <Brain className="w-4 h-4 text-gray-500" title="Cognitive disabilities" />}
          </div>
          <span className="text-gray-200 text-sm">|</span>
        </>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">Priority:</span>
        <PriorityBadge priority={detail.priority} />
      </div>

      {detail.responsibility && (
        <>
          <span className="text-gray-200 text-sm">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Category:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded">
              <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4L1 6l2 2M9 4l2 2-2 2M7 2l-2 8" />
              </svg>
              {detail.responsibility}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

interface Props {
  issueId: string
  onClose: () => void
  variant?: 'default' | 'accessibility'
}

export function IssueDetailPanel({ issueId, onClose, variant = 'default' }: Props) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['issue-detail', issueId, variant],
    queryFn: () => variant === 'accessibility'
      ? getAccessibilityIssueDetail(issueId)
      : getIssueDetail(issueId),
  })

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-gray-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {isLoading
            ? <div className="h-5 w-2/3 bg-gray-100 rounded animate-pulse" />
            : <h2 className="text-[17px] font-bold text-gray-900 leading-snug">{detail?.title}</h2>
          }
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
        ) : detail.category === 'accessibility' ? (
          /* ── Accessibility layout ── */
          <div className="flex-1 flex flex-col overflow-hidden">
            <AccessibilityMeta detail={detail} />
            {detail.description && (
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>
                {detail.learn_more_url && (
                  <a
                    href={detail.learn_more_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-0.5 text-sm text-[#0b66e4] hover:text-[#0952c6]"
                  >
                    Learn more <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
            <AccessibilityElementsView detail={detail} />
          </div>
        ) : (
          /* ── Performance / SEO / Quality layout ── */
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Priority + description */}
            <div className="px-6 pt-5 pb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-500">Priority:</span>
                <PriorityBadge priority={detail.priority} />
              </div>

              {detail.description && (
                <p className="text-sm text-gray-700 leading-relaxed">
                  {detail.learn_more_url ? (
                    <>
                      <a href={detail.learn_more_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800">
                        {detail.audit_title || detail.title}
                      </a>{' '}
                      {detail.description}
                    </>
                  ) : detail.description}
                </p>
              )}
            </div>

            {/* Why this matters / What we recommend */}
            {(detail.impact || detail.recommendation) && (
              <div className="px-6 pb-5 space-y-3">
                {detail.impact && (
                  <SectionAccordion title="Why this matters">
                    <p className="text-sm text-gray-700 leading-relaxed mt-3">{detail.impact}</p>
                  </SectionAccordion>
                )}
                {detail.recommendation && (
                  <SectionAccordion title="What we recommend">
                    <p className="text-sm text-gray-700 leading-relaxed mt-3">{detail.recommendation}</p>
                  </SectionAccordion>
                )}
              </div>
            )}

            {/* Per-page resource data */}
            <ResourcePages detail={detail} />
          </div>
        )}
      </div>
    </div>
  )
}
