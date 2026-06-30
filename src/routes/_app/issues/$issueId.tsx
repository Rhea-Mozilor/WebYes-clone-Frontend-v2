import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, AlertTriangle, Info, Loader2, ExternalLink,
  ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../lib/utils'
import { getIssue } from '../../../api/issues'
import type { Issue } from '../../../types'

export const Route = createFileRoute('/_app/issues/$issueId')({
  component: IssueDetailPage,
})

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MiB`
  if (b >= 1_024) return `${Math.round(b / 1_024)} KiB`
  return `${b} B`
}
function fmtMs(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
}

// ---------------------------------------------------------------------------
// Lighthouse cell helpers
// ---------------------------------------------------------------------------
type LHCell = string | number | boolean | null | undefined | Record<string, unknown>

function nodeLabel(cell: LHCell): string {
  if (!cell || typeof cell !== 'object') return ''
  const o = cell as Record<string, unknown>
  return String(o.nodeLabel ?? o.label ?? o.snippet ?? '')
}

function nodeSnippet(cell: LHCell): string {
  if (!cell || typeof cell !== 'object') return ''
  const o = cell as Record<string, unknown>
  return String(o.snippet ?? '')
}

function cellText(cell: LHCell): string {
  if (cell === null || cell === undefined) return '—'
  if (typeof cell === 'boolean') return cell ? 'Yes' : 'No'
  if (typeof cell === 'number') return String(cell)
  if (typeof cell === 'string') return cell
  const o = cell as Record<string, unknown>
  if (o.type === 'node') return nodeLabel(cell)
  if (o.type === 'url' || 'url' in o) return String(o.url ?? '')
  if (o.type === 'source-location') return `${o.url ?? ''}:${o.line ?? ''}:${o.column ?? ''}`
  if ('value' in o) return String(o.value)
  return ''
}

// Keys to always skip in generic table
const SKIP = new Set(['type', 'subItems', '__type', 'debugData', 'entity'])

function visibleKeys(item: Record<string, unknown>): string[] {
  return Object.keys(item).filter((k) => {
    if (SKIP.has(k)) return false
    const v = item[k]
    if (v === null || v === undefined || v === '') return false
    if (typeof v === 'object' && !Array.isArray(v)) {
      const o = v as Record<string, unknown>
      if (o.type === 'subitems') return false
    }
    return true
  })
}

function humanKey(k: string) {
  return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .replace(/^./, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// Opportunity table (render-blocking, unused-js, etc.)
// ---------------------------------------------------------------------------
function OpportunityTable({ items }: { items: Record<string, unknown>[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)

  // Determine which columns to show
  const hasNode = items.some((i) => i.node && typeof i.node === 'object')
  const hasWastedMs = items.some((i) => typeof i.wastedMs === 'number')
  const hasWastedBytes = items.some((i) => typeof i.wastedBytes === 'number')
  const hasTotalBytes = items.some((i) => typeof i.totalBytes === 'number')

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
      {/* Header */}
      <div className="grid bg-gray-50 border-b border-gray-200 px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px]"
        style={{ gridTemplateColumns: hasNode ? '1fr 180px 140px' : '1fr 140px' }}>
        <span>URL</span>
        {hasNode && <span>Element</span>}
        <span className="text-right">{hasWastedMs ? 'Wasted time' : 'Potential savings'}</span>
      </div>

      {items.map((item, i) => {
        const url = String(item.url ?? item.source ?? '')
        const label = hasNode ? nodeLabel(item.node as LHCell) : ''
        const savings = hasWastedMs
          ? (typeof item.wastedMs === 'number' ? fmtMs(item.wastedMs) : '—')
          : (typeof item.wastedBytes === 'number' ? fmtBytes(item.wastedBytes) : '—')
        const isOpen = expanded === i

        // Sub-detail fields
        const sub: { label: string; value: string }[] = []
        if (item.node) sub.push({ label: 'Node', value: nodeLabel(item.node as LHCell) })
        if (url) sub.push({ label: 'URL', value: url })
        if (typeof item.totalBytes === 'number' && hasTotalBytes)
          sub.push({ label: 'Transfer size', value: fmtBytes(item.totalBytes) })
        if (typeof item.wastedBytes === 'number' && hasWastedBytes)
          sub.push({ label: 'Potential savings', value: fmtBytes(item.wastedBytes) })
        if (typeof item.wastedMs === 'number' && hasWastedMs)
          sub.push({ label: 'Wasted time', value: fmtMs(item.wastedMs) })

        return (
          <div key={i} className="border-b border-gray-100 last:border-0">
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full text-left hover:bg-gray-50 transition-colors"
            >
              <div className="grid items-center px-4 py-3 gap-3"
                style={{ gridTemplateColumns: hasNode ? '1fr 180px 140px 28px' : '1fr 140px 28px' }}>
                <span className="text-blue-600 truncate font-mono text-[11px]">{url || '—'}</span>
                {hasNode && <span className="text-gray-700 truncate">{label}</span>}
                <span className="text-right text-gray-700 font-medium">{savings}</span>
                <span className="flex justify-end text-gray-400">
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>
            </button>

            {isOpen && sub.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-3">
                {/* Node snippet */}
                {!!item.node && nodeSnippet(item.node as LHCell) && (
                  <pre className="text-[10px] bg-white border border-gray-200 rounded p-2 mb-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-600">
                    {nodeSnippet(item.node as LHCell)}
                  </pre>
                )}
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                  {sub.map((s) => (
                    <div key={s.label} className="flex gap-2">
                      <span className="text-gray-400 w-28 shrink-0">{s.label}</span>
                      <span className="text-gray-700 break-all font-mono text-[10px]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic table (table type)
// ---------------------------------------------------------------------------
function GenericTable({ items }: { items: Record<string, unknown>[] }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  if (!items.length) return null

  const keys = visibleKeys(items[0])
  if (!keys.length) return null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden text-xs overflow-x-auto">
      <table className="w-full min-w-max">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {keys.map((k) => (
              <th key={k} className="text-left px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide text-[10px] whitespace-nowrap">
                {humanKey(k)}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, i) => {
            const isOpen = expanded === i
            const snippet = nodeSnippet(item.node as LHCell)
            const subItems = (item.subItems as { items?: Record<string, unknown>[] } | undefined)?.items ?? []
            const hasExpand = !!snippet || subItems.length > 0

            return (
              <>
                <tr key={i} className={cn('hover:bg-gray-50', hasExpand && 'cursor-pointer')}
                  onClick={() => hasExpand && setExpanded(isOpen ? null : i)}>
                  {keys.map((k) => {
                    const v = item[k]
                    const text = cellText(v as LHCell)
                    return (
                      <td key={k} className="px-4 py-2.5 text-gray-700 max-w-xs">
                        <span className="block truncate font-mono text-[11px]">{text || '—'}</span>
                      </td>
                    )
                  })}
                  <td className="px-2 text-gray-400 text-center">
                    {hasExpand && (isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </td>
                </tr>
                {isOpen && (snippet || subItems.length > 0) && (
                  <tr key={`${i}-exp`}>
                    <td colSpan={keys.length + 1} className="bg-gray-50 border-t border-gray-100 px-6 py-3">
                      {snippet && (
                        <pre className="text-[10px] bg-white border border-gray-200 rounded p-2 mb-3 overflow-x-auto whitespace-pre-wrap break-all text-gray-600">
                          {snippet}
                        </pre>
                      )}
                      {subItems.length > 0 && (
                        <div className="space-y-1">
                          {subItems.map((si, j) => (
                            <div key={j} className="text-[11px] text-gray-600">
                              {Object.entries(si).filter(([, v]) => v).map(([k, v]) => (
                                <span key={k} className="mr-4"><span className="text-gray-400">{humanKey(k)}: </span>{cellText(v as LHCell)}</span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List type
// ---------------------------------------------------------------------------
function ListItems({ items }: { items: unknown[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const text = typeof item === 'string' ? item
          : typeof item === 'object' && item !== null
            ? cellText(item as LHCell)
            : String(item)
        const isPass = text.toLowerCase().includes('should') === false &&
          (text.toLowerCase().startsWith('request is') || text.toLowerCase().includes('not use'))
        return (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-700 py-1 border-b border-gray-50 last:border-0">
            {isPass
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            <span>{text}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Critical request chain
// ---------------------------------------------------------------------------
function ChainNode({ node, depth = 0 }: { node: Record<string, unknown>; depth?: number }) {
  const url = String(node.url ?? '')
  const children = node.children as Record<string, Record<string, unknown>> | undefined
  const size = typeof node.transferSize === 'number' ? fmtBytes(node.transferSize) : null
  const time = typeof node.navStartToEndTime === 'number' ? fmtMs(node.navStartToEndTime) : null

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 text-xs" style={{ paddingLeft: `${depth * 20}px` }}>
        {depth > 0 && <span className="text-gray-300">└</span>}
        <span className="font-mono text-blue-600 break-all">{url}</span>
        {size && <span className="text-gray-400 shrink-0">{size}</span>}
        {time && <span className="text-gray-400 shrink-0">{time}</span>}
      </div>
      {children && Object.values(children).map((child, i) => (
        <ChainNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function CriticalRequestChainView({ items }: { items: Record<string, unknown>[] }) {
  // Items can be {type:"network-tree", chains:{...}} or flat url entries
  const allChains: Record<string, unknown>[] = []
  for (const item of items) {
    const chains = item.chains as Record<string, Record<string, unknown>> | undefined
    if (chains) {
      allChains.push(...Object.values(chains))
    } else if (item.url) {
      allChains.push(item)
    }
  }
  if (!allChains.length) return <p className="text-xs text-gray-400">No chain data.</p>
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 divide-y divide-gray-100">
      {allChains.map((chain, i) => (
        <ChainNode key={i} node={chain} depth={0} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main renderer dispatch
// ---------------------------------------------------------------------------
function DetailsSection({ issue }: { issue: Issue }) {
  const raw = issue.details as { items?: unknown[] } | null
  const items = (raw?.items ?? []) as Record<string, unknown>[]
  const type = issue.details_type

  if (!items.length && type !== 'numeric') return null

  // Check if items contain node-type entries (accessibility)
  const hasNodeType = items.some((i) => {
    const n = i.node as Record<string, unknown> | undefined
    return n?.type === 'node' || (i as Record<string, unknown>).type === 'node'
  })

  const title = type === 'opportunity' ? 'Opportunities' : 'Details'

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {issue.item_count != null && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {issue.item_count} {issue.item_count === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {type === 'opportunity' && <OpportunityTable items={items} />}
      {type === 'criticalrequestchain' && <CriticalRequestChainView items={items} />}
      {type === 'list' && <ListItems items={items} />}
      {type === 'numeric' && (
        <p className="text-2xl font-bold text-gray-800">{issue.display_value ?? '—'}</p>
      )}
      {(type === 'table' || (!['opportunity','criticalrequestchain','list','numeric'].includes(type ?? ''))) && (
        hasNodeType
          ? <OpportunityTable items={items} />
          : <GenericTable items={items} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function IssueDetailPage() {
  const { issueId } = Route.useParams()

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => getIssue(issueId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!issue) return <div className="p-8 text-sm text-gray-500">Issue not found.</div>

  const isCritical = issue.severity === 'critical'

  return (
    <div className="p-5 sm:p-8 max-w-4xl">
      <Link to="/scans/$scanId/issues" params={{ scanId: issue.scan_job_id }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Issues
      </Link>

      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-start gap-3 mb-4">
          {isCritical
            ? <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            : <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 leading-snug">{issue.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {issue.display_value && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  {issue.display_value}
                </span>
              )}
              {issue.item_count != null && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {issue.item_count} {issue.item_count === 1 ? 'element' : 'elements'}
                </span>
              )}
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                isCritical ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
                {isCritical ? 'Critical' : 'Non-Critical'}
              </span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
                issue.priority === 'high' ? 'bg-red-100 text-red-700'
                : issue.priority === 'medium' ? 'bg-amber-50 text-amber-700'
                : 'bg-gray-100 text-gray-500')}>
                {issue.priority} priority
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600 capitalize">
                {issue.category.replace('_', ' ')}
              </span>
              {issue.wcag_criterion && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700">
                  WCAG {issue.wcag_version} · {issue.wcag_criterion}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics row */}
        {(issue.wasted_ms != null || issue.wasted_bytes != null) && (
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            {issue.wasted_ms != null && (
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Wasted time</div>
                <div className="text-sm font-bold text-amber-600">{fmtMs(issue.wasted_ms)}</div>
              </div>
            )}
            {issue.wasted_bytes != null && (
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Est. savings</div>
                <div className="text-sm font-bold text-blue-600">{fmtBytes(issue.wasted_bytes)}</div>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          {issue.description || 'No description available.'}
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100">
          {(issue as Issue & { learn_more_url?: string }).learn_more_url && (
            <a href={(issue as Issue & { learn_more_url?: string }).learn_more_url!}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
              Learn more <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {issue.rule_id && (
            <span className="text-xs text-gray-400">
              Rule: <code className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{issue.rule_id}</code>
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <DetailsSection issue={issue} />
    </div>
  )
}
