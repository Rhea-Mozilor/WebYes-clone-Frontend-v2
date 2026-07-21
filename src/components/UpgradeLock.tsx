import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getBillingCredits } from '../api/billing'

export function useIsBasicPlan() {
  const { data: billingCredits } = useQuery({ queryKey: ['billing-credits'], queryFn: getBillingCredits })
  return !billingCredits?.plan_name || billingCredits.plan_name === 'free'
}

export function UpgradeButton({ className, children = 'Upgrade' }: { className?: string; children?: React.ReactNode }) {
  return (
    <Link
      to="/upgrade"
      className={className ?? 'inline-block bg-[#2563eb] text-white text-[13px] font-medium px-6 py-2 rounded-[6px] hover:bg-blue-700 transition-colors'}
    >
      {children}
    </Link>
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

// Footer shown below a list that's been truncated for Basic plans.
export function LimitedListUpgradeFooter({ totalCount, shown }: { totalCount: number; shown: number }) {
  if (totalCount <= shown) return null
  return (
    <div className="text-center py-6 border-t border-gray-100 mt-2">
      <p className="text-[14px] text-[#2e3240] mb-4">
        Your free plan shows only {shown} of {totalCount} issues. Upgrade to see the full list.
      </p>
      <UpgradeButton className="inline-block bg-[#2563eb] text-white text-[14px] font-medium px-8 py-2.5 rounded-[6px] hover:bg-blue-700 transition-colors">
        Unlock all issues
      </UpgradeButton>
    </div>
  )
}
