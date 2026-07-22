// Free/Basic plan issue-list gating, shared across category pages (Accessibility,
// Performance, Quality, SEO) so the limit can't drift between pages.
export const FREE_PLAN_VISIBLE_ROWS = 5
// Rows 0..FREE_PLAN_VISIBLE_ROWS-1 render normally; rows up to this count render
// blurred as an upgrade teaser.
export const FREE_PLAN_PREVIEW_ROWS = 8

export function isRowLocked(index: number, isBasicPlan: boolean) {
  return isBasicPlan && index >= FREE_PLAN_VISIBLE_ROWS
}
