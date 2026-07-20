import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { getBillingPlans, getBillingSummary, createCheckout, cancelSubscription } from '../../api/billing'
import type { BillingPlan, BillingPlanId, BillingPlanName } from '../../types'

export const Route = createFileRoute('/_app/upgrade')({
  component: UpgradePage,
})

type CtaVariant = 'ghost' | 'primary' | 'outline'

const STATIC_PLAN_META: Record<BillingPlanName, {
  desc: string; ctaLabel: string; ctaVariant: CtaVariant; popular: boolean; pages: number
}> = {
  free: {
    desc: 'Perfect for individuals, small websites, and exploring WebYes capabilities',
    ctaLabel: 'Stay on free plan',
    ctaVariant: 'ghost',
    popular: false,
    pages: 5,
  },
  pro: {
    desc: 'For small agencies, businesses, and freelancers',
    ctaLabel: 'Upgrade to Pro',
    ctaVariant: 'primary',
    popular: true,
    pages: 350,
  },
  enterprise: {
    desc: 'Perfect for agencies with a large client base and big businesses',
    ctaLabel: 'Upgrade to Enterprise',
    ctaVariant: 'outline',
    popular: false,
    pages: 1000,
  },
}

// Backend no longer groups monthly/annually variants of the same plan — build
// a display card from whichever variants are present for a given plan name.
function buildPlanCard(name: BillingPlanName, variants: BillingPlan[]) {
  const monthly = variants.find((v) => v.billing_period === 'monthly' || v.billing_period === null)
  const annually = variants.find((v) => v.billing_period === 'annually')
  if (!monthly && !annually) return null

  const monthlyPrice = monthly?.price ?? null
  const annualTotal = annually?.price ?? null
  const annualPerMonth = annualTotal != null ? Math.round(annualTotal / 12) : null
  const annualSaving = monthlyPrice != null && annualTotal != null ? monthlyPrice * 12 - annualTotal : null
  const source = monthly ?? annually!

  return {
    key: name.toUpperCase(),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...STATIC_PLAN_META[name],
    monthlyPrice,
    annualPrice: annualPerMonth,
    annualSaving,
    annualBilled: annualTotal,
    credits: source.credits,
    planIdMonthly: monthly?.id ?? null,
    planIdAnnually: annually?.id ?? null,
    features: source.features.filter((f) => f.included).map((f) => f.text),
    scaleExtras: null as string[] | null,
  }
}

const SCALE_PLAN = {
  key: 'SCALE',
  name: 'Scale-up',
  desc: 'Perfect for agencies with a large client base and big businesses',
  monthlyPrice: null as number | null,
  annualPrice: null as number | null,
  annualSaving: null as number | null,
  annualBilled: null as number | null,
  pages: null as number | null,
  credits: null as number | null,
  planIdMonthly: null as string | null,
  planIdAnnually: null as string | null,
  ctaLabel: 'Contact sales',
  ctaVariant: 'outline' as CtaVariant,
  popular: false,
  features: [] as string[],
  scaleExtras: [
    'Scan credits based on requirement',
    'Dedicated support',
    'Custom SLA',
    'On-premise option',
  ] as string[] | null,
}

function CheckIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="shrink-0 mt-0.5">
      <path d="M1.5 6l4.5 4.5L14.5 1.5" stroke="#219653" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function UpgradePage() {
  const qc = useQueryClient()
  const [billing, setBilling] = useState<'monthly' | 'annually'>('monthly')
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelStep, setCancelStep] = useState<1 | 2 | 3>(1)
  const [cancelReason, setCancelReason] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const { data: summary } = useQuery({ queryKey: ['billing-summary'], queryFn: getBillingSummary })
  const { data: plansResp } = useQuery({ queryKey: ['billing-plans'], queryFn: getBillingPlans })

  const currentPlan = (summary?.plan_name ?? 'free').toUpperCase()

  const plansByName: Record<string, BillingPlan[]> = {}
  for (const p of plansResp?.plans ?? []) {
    (plansByName[p.name] ??= []).push(p)
  }
  const plans = [
    ...(['free', 'pro', 'enterprise'] as BillingPlanName[])
      .map((name) => buildPlanCard(name, plansByName[name] ?? []))
      .filter((p): p is NonNullable<typeof p> => p !== null),
    SCALE_PLAN,
  ]

  const checkoutMutation = useMutation({
    mutationFn: (planId: BillingPlanId) => createCheckout(planId),
    onSuccess: (data) => { window.location.href = data.checkout_url },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Unable to start checkout'
      toast.error(detail)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      qc.invalidateQueries({ queryKey: ['billing-credits'] })
      setCancelModalOpen(false); setCancelStep(1); setCancelReason(null); setCancelled(true)
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Unable to cancel subscription'
      toast.error(detail)
      setCancelModalOpen(false)
    },
  })

  const startCheckout = (plan: typeof plans[number]) => {
    const planId = billing === 'monthly' ? plan.planIdMonthly : plan.planIdAnnually
    if (planId) checkoutMutation.mutate(planId as BillingPlanId)
  }

  if (cancelled) {
    return (
      <div className="min-h-full bg-[#f3f4f6] flex items-center justify-center py-16 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-[580px] px-10 py-10 text-center">
          <div className="w-14 h-14 rounded-full border-2 border-blue-500 flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
              <path d="M2 10l8 8L24 2" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-[22px] font-bold text-[#2e3240] mb-2">Your subscription was cancelled</h2>
          <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">
            You won't be able to access the premium features after your subscription ends
            {summary?.expires_in_days != null ? (
              <>
                {' '}on <span className="font-bold text-[#2e3240]">
                  {new Date(Date.now() + summary.expires_in_days * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>.
              </>
            ) : '.'}
          </p>
          <div className="space-y-3 mb-7 text-left">
            <div className="border border-blue-200 bg-blue-50 rounded-xl px-5 py-4 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                <circle cx="9" cy="9" r="8" stroke="#2563eb" strokeWidth="1.5" />
                <path d="M9 8v5M9 6v.5" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-[14px] font-bold text-[#2e3240] mb-1">Your data will be retained</p>
                <p className="text-[13px] text-gray-600 leading-relaxed">You will still be able to see all your website audit data in your free account, but limited access to scanning and other premium features.</p>
              </div>
            </div>
            <div className="border border-green-200 bg-green-50 rounded-xl px-5 py-4 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                <circle cx="9" cy="9" r="8" stroke="#16a34a" strokeWidth="1.5" />
                <path d="M9 8v5M9 6v.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div>
                <p className="text-[14px] font-bold text-[#2e3240] mb-1">Easy to reactivate</p>
                <p className="text-[13px] text-gray-600 leading-relaxed">You can get access to the premium features anytime by upgrading to any of the paid plans.</p>
              </div>
            </div>
          </div>
          <Link to="/dashboard" className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-xl transition-colors">
            Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#f3f4f6]">
      {/* Back link */}
      <div className="px-8 pt-6 pb-0">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </Link>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Start fixing your website today</h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto leading-relaxed">
            Pick the plan that supports your accessibility goals - AI-powered audits,<br />
            actionable fixes, and monitoring you can rely on.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="relative inline-flex bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billing === 'monthly'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <div className="relative">
              <button
                onClick={() => setBilling('annually')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === 'annually'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annually
              </button>
              {billing === 'annually' && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-10">
                  <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    2 months free
                  </div>
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-green-600 mx-auto" style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)' }} />
                </div>
              )}
            </div>
          </div>
          <p className="text-green-600 text-sm font-medium">
            Save up to 22% when you pay annually with 2 months free
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const monthlyOrig = plan.monthlyPrice

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                  plan.popular
                    ? 'border-2 border-blue-500 mt-[-8px]'
                    : 'border border-gray-200'
                }`}
              >
                {/* Most popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan name + desc */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h2>
                  <p className="text-sm text-gray-500 leading-snug">{plan.desc}</p>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {plan.monthlyPrice === null ? (
                    <div className="text-3xl font-bold text-gray-900">Custom</div>
                  ) : plan.monthlyPrice === 0 ? (
                    <div className="text-4xl font-bold text-gray-900">$0</div>
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      {billing === 'annually' && (
                        <span className="text-lg text-gray-400 line-through">${monthlyOrig}</span>
                      )}
                      <span className="text-4xl font-bold text-gray-900">${price}</span>
                      <span className="text-sm text-gray-500">/month</span>
                    </div>
                  )}
                </div>

                {/* Saving / billed note */}
                <div className="h-5 mb-4">
                  {billing === 'monthly' && plan.annualSaving && (
                    <p className="text-sm text-green-600 font-medium">Save ${plan.annualSaving}/yr on annual</p>
                  )}
                  {billing === 'annually' && plan.annualBilled && (
                    <p className="text-sm text-green-600 font-medium">
                      Billed ${plan.annualBilled}/yr - you save ${plan.annualSaving}
                    </p>
                  )}
                  {plan.monthlyPrice === 0 && (
                    <p className="text-sm text-gray-400">Always free — no expiry</p>
                  )}
                </div>

                {/* CTA button */}
                <div className="mb-5">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold cursor-default"
                    >
                      {plan.key === 'PRO' ? 'Pro' : 'Current plan'}
                    </button>
                  ) : plan.ctaVariant === 'ghost' ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-400 cursor-default bg-gray-50"
                    >
                      {plan.ctaLabel}
                    </button>
                  ) : plan.ctaVariant === 'primary' ? (
                    <button
                      disabled={checkoutMutation.isPending}
                      onClick={() => startCheckout(plan)}
                      className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                    >
                      {checkoutMutation.isPending ? 'Redirecting...' : plan.ctaLabel}
                    </button>
                  ) : plan.key === 'SCALE' ? (
                    <a
                      href="mailto:support@webyes.com"
                      className="block w-full py-2.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition-colors text-center"
                    >
                      {plan.ctaLabel}
                    </a>
                  ) : (
                    <button
                      disabled={checkoutMutation.isPending}
                      onClick={() => startCheckout(plan)}
                      className="w-full py-2.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-60 text-sm font-semibold transition-colors"
                    >
                      {checkoutMutation.isPending ? 'Redirecting...' : plan.ctaLabel}
                    </button>
                  )}
                </div>

                {/* Pages badge */}
                {plan.pages !== null && (
                  <div className="bg-blue-50 rounded-lg px-4 py-2.5 mb-4">
                    <span className="text-sm text-gray-700">Up to </span>
                    <span className="text-sm font-bold text-blue-600">
                      {plan.pages.toLocaleString()} web pages
                    </span>
                  </div>
                )}

                {/* Features */}
                {plan.scaleExtras ? (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      Everything in Enterprise, plus
                    </p>
                    <ul className="flex flex-col gap-2">
                      {plan.scaleExtras.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : plan.features.length > 0 ? (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Includes</p>
                    <ul className="flex flex-col gap-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Talk to us */}
        <p className="text-center text-sm text-gray-500 mb-10">
          Still confused if this plan is right for you?{' '}
          <a href="mailto:support@webyes.com" className="text-blue-600 hover:underline font-medium">
            Talk to us
          </a>
        </p>

        {/* Cancel Plan */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-5">Cancel Plan</h2>
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4 w-full">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel plan</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  By cancelling your subscription, your account will downgrade to the free plan after the current plan ends. You will only have access to 10 credits when downgraded, but your existing audit data will be retained.
                </p>
              </div>
              <div className="mt-auto pt-2">
                <button
                  onClick={() => setCancelModalOpen(true)}
                  className="px-5 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition-colors"
                >
                  Cancel my plan
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-12" />
      </div>

      {/* Cancel plan modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setCancelModalOpen(false); setCancelStep(1); setCancelReason(null) }}>
          <div className="bg-[#f3f4f6] rounded-2xl w-full max-w-[540px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

            {/* Plan badge */}
            <div className="flex justify-end px-5 pt-5">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[12px] font-semibold rounded-md">
                {currentPlan === 'PRO' ? 'Pro plan' : currentPlan === 'ENTERPRISE' ? 'Enterprise plan' : 'Free plan'}
              </span>
            </div>

            {cancelStep === 1 ? (
              <>
                {/* Step 1 — Before you go */}
                <div className="px-10 pb-5 text-center">
                  <h2 className="text-[22px] font-bold text-[#2e3240] mb-2">Before you go...</h2>
                  <p className="text-[14px] text-gray-500 leading-relaxed">
                    Your website still has room to improve. Stay on track with tools that help you monitor and optimize performance.
                  </p>
                </div>

                <div className="mx-8 mb-5 rounded-2xl border-2 border-blue-400 overflow-hidden">
                  <div className="bg-blue-50 py-4 flex justify-center">
                    <svg width="48" height="36" viewBox="0 0 48 36" fill="none">
                      <circle cx="18" cy="18" r="17" stroke="#3b82f6" strokeWidth="2" fill="white" />
                      <text x="18" y="23" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#3b82f6">①</text>
                      <circle cx="30" cy="18" r="17" stroke="#3b82f6" strokeWidth="2" fill="white" />
                      <text x="30" y="23" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#3b82f6">②</text>
                    </svg>
                  </div>
                  <div className="bg-white py-5 text-center">
                    <div className="text-[42px] font-bold text-blue-600 leading-none mb-1">
                      {summary?.credits_balance ?? 0}
                    </div>
                    <div className="text-[14px] text-[#2e3240]">Credits yet to use</div>
                  </div>
                </div>

                <div className="mx-8 mb-6 bg-white rounded-xl px-6 py-5">
                  <p className="text-[14px] font-bold text-[#2e3240] mb-3">Cancelling now means losing access to:</p>
                  <ul className="space-y-2">
                    {['Additional scan credits', 'Automated scanning and monitoring', 'Advanced tools like RUM and Inspector'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[14px] text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-3 px-8 pb-8">
                  <button
                    onClick={() => setCancelStep(2)}
                    className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold rounded-xl transition-colors"
                  >
                    Continue to Cancellation
                  </button>
                  <button
                    onClick={() => { setCancelModalOpen(false); setCancelStep(1) }}
                    className="px-7 py-3 border border-gray-300 text-[14px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Keep my plan
                  </button>
                </div>
              </>
            ) : cancelStep === 3 ? (
              <>
                {/* Step 3 — Last chance offer */}
                <div className="px-8 pb-3 text-center">
                  <h2 className="text-[22px] font-bold text-[#2e3240] mb-5 leading-snug">
                    Last chance to keep Webyes<br />at its{' '}
                    <span className="text-blue-600">lowest price!</span>
                  </h2>
                  <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-blue-100 px-8 py-7 mb-5 text-center">
                    <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 11.1l-3.75 2.7 1.5-4.5L6 6.5h4.5L12 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="white" />
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" />
                        <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="text-[28px] font-bold text-blue-600 mb-2">
                      Now at ${plans.find((p) => p.key === currentPlan)?.annualBilled ?? 0}/yearly
                    </div>
                    <span className="inline-block px-3 py-1 rounded-md bg-purple-100 text-purple-600 text-[12px] font-semibold mb-3">Early-bird offer</span>
                    <p className="text-[13px] text-[#2e3240]">You may not get it at this price ever again.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-8 pb-8">
                  <button
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate()}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl transition-colors"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Proceed to Cancel'}
                  </button>
                  <button
                    onClick={() => { setCancelModalOpen(false); setCancelStep(1); setCancelReason(null) }}
                    className="flex-1 py-3 border border-gray-300 text-[14px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Continue plan
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2 — Cancellation reason */}
                <div className="px-8 pb-3">
                  <h2 className="text-[20px] font-bold text-[#2e3240] mb-5">Can you tell us why you're cancelling?</h2>
                  <div className="space-y-4">
                    {['Too expensive', "Didn't find it useful", 'Technical issues/bug', 'Switching to another solution', 'Already resolved the issues', 'Other'].map((reason) => (
                      <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${cancelReason === reason ? 'border-blue-600' : 'border-gray-300 group-hover:border-gray-400'}`}>
                          {cancelReason === reason && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                        </div>
                        <input type="radio" name="cancelReason" value={reason} checked={cancelReason === reason} onChange={() => setCancelReason(reason)} className="sr-only" />
                        <span className="text-[15px] text-[#2e3240]">{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-8 py-6">
                  <button
                    disabled={!cancelReason}
                    onClick={() => setCancelStep(3)}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-xl transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    onClick={() => { setCancelModalOpen(false); setCancelStep(1); setCancelReason(null) }}
                    className="flex-1 py-3 border border-gray-300 text-[14px] font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
