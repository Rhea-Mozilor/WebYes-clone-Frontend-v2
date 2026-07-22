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
