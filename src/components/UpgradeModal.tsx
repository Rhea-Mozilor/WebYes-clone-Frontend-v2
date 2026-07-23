import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { getBillingPlans } from '../api/billing'

const FALLBACK_FEATURES = [
  '700 credits per month',
  'Multiple organizations and websites',
  'Advanced features like RUM',
]

function useProPlanSummary() {
  const { data } = useQuery({ queryKey: ['billing-plans'], queryFn: getBillingPlans })
  const variants = (data?.plans ?? []).filter((p) => p.name === 'pro')
  const monthly = variants.find((v) => v.billing_period === 'monthly' || v.billing_period === null)
  const annually = variants.find((v) => v.billing_period === 'annually')
  if (!monthly && !annually) return null

  const monthlyPrice = monthly?.price ?? null
  const annualTotal = annually?.price ?? null
  const annualPerMonth = annualTotal != null ? Math.round(annualTotal / 12) : monthlyPrice
  const annualSaving = monthlyPrice != null && annualTotal != null ? monthlyPrice * 12 - annualTotal : null
  const source = monthly ?? annually!

  return {
    monthlyPrice,
    annualPerMonth,
    annualTotal,
    annualSaving,
    features: source.features.filter((f) => f.included).map((f) => f.text).slice(0, 3),
  }
}

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const plan = useProPlanSummary()
  const features = plan?.features.length ? plan.features : FALLBACK_FEATURES

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-7 pt-7 pb-6" style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #ffffff 100%)' }}>
          <div className="flex items-start justify-between">
            <h2 className="text-[22px] font-bold text-gray-900">View all issues</h2>
            <button onClick={onClose} className="text-gray-700/70 hover:text-gray-900 transition-colors -mt-1 -mr-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[14px] text-gray-800 mt-2 leading-relaxed">
            Upgrade to unlock the full list of issues across all scanned pages and leave nothing unaddressed.
          </p>
        </div>

        <div className="px-7 pb-7">
          <div className="flex items-end justify-between mb-1">
            <div className="flex items-baseline gap-2">
              {plan?.monthlyPrice != null && (
                <span className="text-lg text-gray-400 line-through">${plan.monthlyPrice}</span>
              )}
              <span className="text-4xl font-bold text-gray-900">${plan?.annualPerMonth ?? '—'}</span>
              <span className="text-sm text-gray-500">/month</span>
            </div>
            <span className="text-sm font-bold text-gray-900 shrink-0">Pro plan</span>
          </div>
          {plan?.annualTotal != null && plan.annualSaving != null && plan.annualSaving > 0 && (
            <p className="text-[13px] font-medium text-green-600 mb-4">
              Billed ${plan.annualTotal}/yr - you save ${plan.annualSaving}
            </p>
          )}

          <div className="border border-gray-100 bg-gray-50 rounded-xl px-5 py-4 flex flex-col gap-3 mb-6 mt-4">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="shrink-0">
                  <path d="M1.5 6l4.5 4.5L14.5 1.5" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[14px] text-gray-800">{f}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { onClose(); navigate({ to: '/upgrade' }) }}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-xl transition-colors"
          >
            Upgrade now
          </button>
        </div>
      </div>
    </div>
  )
}
