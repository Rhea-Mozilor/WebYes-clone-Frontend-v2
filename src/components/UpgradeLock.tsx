import { useQuery } from '@tanstack/react-query'
import { getBillingCredits } from '../api/billing'
import { FREE_PLAN_VISIBLE_ROWS } from '../lib/planLimits'
import { useUpgradeModal } from '../lib/UpgradeModalContext'

export function useIsBasicPlan() {
  const { data: billingCredits } = useQuery({ queryKey: ['billing-credits'], queryFn: getBillingCredits })
  return !billingCredits?.plan_name || billingCredits.plan_name === 'free'
}

export function UpgradeButton({ className, children = 'Upgrade' }: { className?: string; children?: React.ReactNode }) {
  const { openUpgradeModal } = useUpgradeModal()
  return (
    <button
      onClick={openUpgradeModal}
      className={className ?? 'inline-block bg-[#2563eb] text-white text-[13px] font-medium px-6 py-2 rounded-[6px] hover:bg-blue-700 transition-colors'}
    >
      {children}
    </button>
  )
}

// Blurs whatever is passed as `children` and overlays a centered upgrade prompt on top.
// Parent must be `relative` (or this component's wrapper provides it) for the overlay to sit correctly.
export function LockedOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[1.5px] z-10 rounded-[8px]">
      <p className="text-[13px] font-medium text-[#2e3240] text-center px-6 max-w-[320px]">{label}</p>
      <UpgradeButton />
    </div>
  )
}

// Overlay shown centered on top of a list's blurred/locked rows, in place of a footer below the list.
// Parent wrapping the locked rows must be `relative` (and typically `overflow-hidden`) for this to sit correctly.
// `force` shows the overlay even when there's nothing beyond `shown` to count — used when the backend
// has already told us the account is restricted (is_restricted), regardless of how many rows came back.
export function LockedRowsOverlay({ totalCount, shown = FREE_PLAN_VISIBLE_ROWS, force = false }: { totalCount: number; shown?: number; force?: boolean }) {
  if (!force && totalCount <= shown) return null
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 backdrop-blur-[1px] z-10 px-6">
      <p className="text-[14px] text-[#2e3240] text-center">
        {totalCount > shown
          ? <>Your free plan shows only {shown} of {totalCount} issues. Upgrade to see the full list.</>
          : 'Upgrade to unlock the full list of issues and get the full picture of your website\'s health.'}
      </p>
      <UpgradeButton className="inline-block bg-[#2563eb] text-white text-[14px] font-medium px-8 py-2.5 rounded-[6px] hover:bg-blue-700 transition-colors">
        Unlock all issues
      </UpgradeButton>
    </div>
  )
}
