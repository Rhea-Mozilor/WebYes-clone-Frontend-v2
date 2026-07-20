import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { getBillingSummary } from '../../api/billing'

export const Route = createFileRoute('/upgrade/success')({
  component: UpgradeSuccessPage,
})

function UpgradeSuccessPage() {
  const { data: summary } = useQuery({ queryKey: ['billing-summary'], queryFn: getBillingSummary })

  const planName = summary?.plan_name ?? ''
  const planNameCap = planName.charAt(0).toUpperCase() + planName.slice(1)
  const planLabel = summary
    ? planName === 'free' ? 'Free' : `${planNameCap} ${summary.billing_period === 'annually' ? 'Yearly' : 'Monthly'}`
    : 'new'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[680px] bg-[#f5f4fd] rounded-2xl px-10 py-14 text-center">
        <div className="font-bold text-3xl text-gray-900 mb-6">
          <span className="text-blue-600">W</span>ebYes
        </div>

        <h1 className="flex items-center justify-center gap-2 text-[26px] font-semibold text-[#2e3240]">
          Successfully upgraded to the {planLabel} plan!
          <Crown className="w-6 h-6 text-orange-400 -translate-y-1.5" />
        </h1>

        <p className="text-[16px] text-gray-500 mt-3">
          You can start using the {planLabel} plan features now
        </p>

        <Link
          to="/dashboard"
          className="inline-block w-full max-w-[380px] mt-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-lg transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
