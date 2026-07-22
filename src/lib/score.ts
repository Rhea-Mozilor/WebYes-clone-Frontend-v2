// Score color scale, shared across every page that renders a score (dashboard,
// category pages, scan results, guest scan, ScoreCircle) so the thresholds can't
// drift between them.
export const SCORE_GOOD_THRESHOLD = 90
export const SCORE_WARNING_THRESHOLD = 50

export function scoreColor(score: number): string {
  if (score >= SCORE_GOOD_THRESHOLD) return '#22c55e'
  if (score >= SCORE_WARNING_THRESHOLD) return '#f59e0b'
  return '#ef4444'
}

export function scoreColorPair(score: number): { stroke: string; text: string } {
  if (score >= SCORE_GOOD_THRESHOLD) return { stroke: '#22c55e', text: '#15803d' }
  if (score >= SCORE_WARNING_THRESHOLD) return { stroke: '#f59e0b', text: '#b45309' }
  return { stroke: '#ef4444', text: '#b91c1c' }
}
