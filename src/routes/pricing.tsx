import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { getBillingPlans } from '../api/billing'
import type { BillingPlan, BillingPlanName } from '../types'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

type CtaVariant = 'primary' | 'outline'

const STATIC_PRICING_META: Record<BillingPlanName, {
  desc: string
  ctaLabel: string
  ctaVariant: CtaVariant
  popular: boolean
  features: string[]
}> = {
  free: {
    desc: 'Perfect for individuals, small websites, and exploring WebYes capabilities',
    ctaLabel: 'Get started',
    ctaVariant: 'outline',
    popular: false,
    features: [
      'Scan for performance, quality, SEO, and accessibility issues',
      'Configure uptime monitoring',
      'Role-based issue categorisation (upto 5 issues)',
      'Single mode of scanning',
      'Supports one domain',
      'Single user account',
      'Conformance level A and AA',
      'Medium priority support',
    ],
  },
  pro: {
    desc: 'For small agencies, businesses, and freelancers',
    ctaLabel: 'Start Free Trial',
    ctaVariant: 'primary',
    popular: true,
    features: [
      'Scan for performance, quality, SEO, and accessibility.',
      'Jira integration',
      'Role-based issue categorisation',
      'Supports unlimited domains and multiple users',
      'Configure Real User Monitoring',
      'Configure uptime monitoring',
      'Add multiple users with access control',
      'Conformance level A, AA, and AAA',
      'Full access to the Page Inspector tool',
      'Get AI-generated solutions integrated with the Page Inspector tool',
      'High-priority support',
    ],
  },
  enterprise: {
    desc: 'Perfect for agencies with a large client base and big businesses',
    ctaLabel: 'Start Free Trial',
    ctaVariant: 'outline',
    popular: false,
    features: [
      'Scan for performance, quality, SEO, and accessibility.',
      'Jira integration',
      'Role-based issue categorisation',
      'Supports unlimited domains and multiple users',
      'Configure Real User Monitoring',
      'Configure uptime monitoring',
      'Add multiple users with access control',
      'Conformance level A, AA, and AAA',
      'Full access to the Page Inspector tool',
      'Get AI-generated solutions integrated with the Page Inspector tool',
      'High-priority support',
    ],
  },
}

function buildPlanCard(name: BillingPlanName, variants: BillingPlan[]) {
  const monthly = variants.find((v) => v.billing_period === 'monthly' || v.billing_period === null)
  const annually = variants.find((v) => v.billing_period === 'annually')
  if (!monthly && !annually) return null

  const monthlyPrice = monthly?.price ?? null
  const annualTotal = annually?.price ?? null
  const annualPerMonth = annualTotal != null ? Math.round(annualTotal / 12) : null
  const annualSaving = monthlyPrice != null && annualTotal != null ? monthlyPrice * 12 - annualTotal : null

  return {
    key: name,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    ...STATIC_PRICING_META[name],
    monthlyPrice,
    annualPrice: annualPerMonth,
    annualSaving,
    annualBilled: annualTotal,
    credits: monthly?.credits ?? annually?.credits ?? null,
  }
}

function CheckIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="shrink-0 mt-0.5">
      <path d="M1.5 7l5 5L16.5 1.5" stroke="#219653" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PricingPage() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<'monthly' | 'annually'>('annually')
  const { data: plansResp } = useQuery({ queryKey: ['billing-plans'], queryFn: getBillingPlans })

  const plansByName: Record<string, BillingPlan[]> = {}
  for (const p of plansResp?.plans ?? []) {
    (plansByName[p.name] ??= []).push(p)
  }
  const plans = (['free', 'pro', 'enterprise'] as BillingPlanName[])
    .map((name) => buildPlanCard(name, plansByName[name] ?? []))
    .filter((p): p is NonNullable<typeof p> => p !== null)

  function continueToOnboarding() {
    navigate({ to: '/onboarding' })
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 py-16">
        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-[42px] font-bold text-gray-900 mb-4">Flexible pricing for every need</h1>
          <p className="text-gray-600 text-base">Explore plans across our products and choose what works best for your workflow.</p>
          <p className="text-gray-600 text-base">Upgrade anytime as you grow.</p>
        </div>

        {/* Billing toggle + currency */}
        <div className="relative flex items-center justify-center mb-12">
          <div className="inline-flex bg-white rounded-full p-1.5 shadow-sm border border-gray-200">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-8 py-3 rounded-full text-base font-medium transition-colors ${
                billing === 'monthly' ? 'bg-indigo-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annually')}
              className={`px-8 py-3 rounded-full text-base font-medium transition-colors ${
                billing === 'annually' ? 'bg-indigo-200 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annually
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 absolute right-0 text-sm text-gray-700">
            Currency
            <div className="flex items-center gap-1.5 border border-gray-300 rounded px-3 py-2">
              $(USD)
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const monthlyOrig = plan.monthlyPrice

            return (
              <div
                key={plan.key}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.popular ? 'border-2 border-blue-600 shadow-lg' : 'border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                  {plan.popular && (
                    <span className="bg-amber-400 text-gray-900 text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-base mb-6">{plan.desc}</p>

                <div className="mb-1">
                  {plan.monthlyPrice === 0 ? (
                    <div className="text-5xl font-extrabold text-gray-900">$0</div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      {billing === 'annually' && (
                        <span className="text-xl text-gray-400 line-through">${monthlyOrig}</span>
                      )}
                      <span className="text-5xl font-extrabold text-gray-900">${price}</span>
                      <span className="text-lg text-gray-500">/month</span>
                    </div>
                  )}
                </div>

                <div className="h-6 mb-6">
                  {plan.monthlyPrice === 0 && (
                    <p className="text-sm text-green-600 font-medium">Always free - no expiry</p>
                  )}
                  {billing === 'monthly' && plan.annualSaving && (
                    <p className="text-sm text-green-600 font-medium">Save ${plan.annualSaving}/yr on annual</p>
                  )}
                  {billing === 'annually' && plan.annualBilled && (
                    <p className="text-sm text-green-600 font-medium">
                      Billed ${plan.annualBilled}/year - you save ${plan.annualSaving}
                    </p>
                  )}
                </div>

                <button
                  onClick={continueToOnboarding}
                  className={
                    plan.ctaVariant === 'primary'
                      ? 'w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold transition-colors mb-8'
                      : 'w-full py-3.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-base font-semibold transition-colors mb-8'
                  }
                >
                  {plan.ctaLabel}
                </button>

                <ul className="flex flex-col gap-4">
                  <li className="flex items-start gap-3 text-base text-gray-700">
                    <CheckIcon />
                    {plan.credits} scan credits
                  </li>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-base text-gray-700">
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          {/* Scale-up — static, no backend equivalent */}
          <div className="rounded-2xl p-8 flex flex-col border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Scale-up</h2>
            <p className="text-gray-600 text-base mb-6">Searching for a tailored plan that fits your unique requirements?</p>
            <div className="text-5xl font-extrabold text-gray-900 mb-1">Custom</div>
            <div className="h-6 mb-6" />
            <button
              onClick={continueToOnboarding}
              className="w-full py-3.5 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-base font-semibold transition-colors mb-8"
            >
              Contact sales
            </button>
            <p className="font-bold text-gray-900 mb-3">Everything in Enterprise +</p>
            <p className="text-gray-600 text-base leading-relaxed">
              Scan credits based on requirements. Dedicated support.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA banner */}
      <div className="w-full bg-blue-600 py-20 px-6 text-center">
        <h2 className="text-white text-4xl md:text-5xl font-extrabold mb-4">
          Make your website the best it can be with WebYes
        </h2>
        <p className="text-white/90 text-lg mb-8">
          Audit, test, and find fixes for your website's technical and accessibility issues with WebYes full feature experience.
        </p>
        <button
          onClick={continueToOnboarding}
          className="bg-white text-blue-600 hover:bg-gray-100 rounded-lg px-8 py-3.5 text-base font-semibold transition-colors"
        >
          Start for free
        </button>
      </div>
    </div>
  )
}
