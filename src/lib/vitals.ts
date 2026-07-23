// Core Web Vitals "good" / "needs improvement" thresholds, shared between the
// Performance category page and the per-page performance detail panel so the
// two views can't silently disagree on what counts as a good score.
export const VITAL_THRESHOLDS = {
  fcp_ms: { good: 1800, needs: 3000 },
  lcp_ms: { good: 2500, needs: 4000 },
  tbt_ms: { good: 200, needs: 600 },
  cls: { good: 0.1, needs: 0.25 },
  speed_index_ms: { good: 3400, needs: 5800 },
} as const

export type VitalKey = keyof typeof VITAL_THRESHOLDS

// Shared metric metadata for the vitals gauge row — also used by
// VitalsGrid so the Performance page and the per-page detail panel render
// identical abbreviations, labels, and units instead of silently diverging.
export const VITALS_META: { key: VitalKey; abbr: string; label: string; unit: 's' | 'ms' | ''; good: number; needs: number }[] = [
  { key: 'fcp_ms', abbr: 'FCP', label: 'First Contentful Paint', unit: 's', ...VITAL_THRESHOLDS.fcp_ms },
  { key: 'lcp_ms', abbr: 'LCP', label: 'Largest Contentful Paint', unit: 's', ...VITAL_THRESHOLDS.lcp_ms },
  { key: 'tbt_ms', abbr: 'TBT', label: 'Total Blocking Time', unit: 's', ...VITAL_THRESHOLDS.tbt_ms },
  { key: 'cls', abbr: 'CLS', label: 'Cumulative Layout Shift', unit: '', ...VITAL_THRESHOLDS.cls },
  { key: 'speed_index_ms', abbr: 'SI', label: 'Speed Index', unit: 'ms', ...VITAL_THRESHOLDS.speed_index_ms },
]

export function formatVital(key: VitalKey, value: number | null | undefined, unit: string): string {
  if (value == null) return '—'
  if (key === 'cls') return value.toFixed(2)
  if (unit === 's') return `${(value / 1000).toFixed(1)} s`
  if (unit === 'ms') return value > 0 ? `${Math.round(value)} ms` : '0ms'
  return `${value}`
}
