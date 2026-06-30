import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Check } from 'lucide-react'

export const Route = createFileRoute('/_app/upgrade')({
  component: UpgradePage,
})

const plans = [
  {
    audience: 'For individuals',
    name: 'Basic',
    price: null,
    label: 'Free',
    credits: '10 credit points',
    levels: 'Level A, Level AA',
    domains: '1 Domain',
    button: 'Free plan',
    buttonStyle: 'border border-gray-300 text-gray-800 bg-white hover:bg-gray-50',
    highlight: false,
    features: [
      'Can scan upto 10 webpages',
      'Displays scores for Performance, Accessibility, Quality & SEO',
      'PDF report of scan available',
      'Scan history retained',
    ],
  },
  {
    audience: 'For startups',
    name: 'Pro',
    price: 59,
    label: null,
    credits: '700 credit points',
    levels: 'Level A, Level AA, Level AAA',
    domains: 'Domain unlimited',
    button: 'Current plan',
    buttonStyle: 'border border-gray-800 text-gray-800 bg-white hover:bg-gray-50',
    highlight: false,
    features: [
      'Can scan upto 10 webpages',
      'Displays scores for Performance, Accessibility, Quality & SEO',
      'PDF report of scan available',
      'Scan history retained',
    ],
  },
  {
    audience: 'For big companies',
    name: 'Enterprise',
    price: 99,
    label: null,
    credits: '2000 credit points',
    levels: 'Level A, Level AA, Level AAA',
    domains: 'Domain unlimited',
    button: 'Upgrade to Enterprise',
    buttonStyle: 'bg-blue-600 text-white hover:bg-blue-700',
    highlight: true,
    features: [
      'Can scan upto 100 webpages',
      'Displays scores for Performance, Accessibility, Quality & SEO',
      'PDF report of scan available',
      'Scan history retained',
    ],
  },
]

function UpgradePage() {
  const navigate = useNavigate()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div className="min-h-full bg-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-8">
          ← Back
        </Link>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">Get Unlimited Access.</h1>

        {/* Billing toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex border border-gray-200 rounded-full p-0.5 bg-gray-50">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${plan.highlight ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
            >
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <div className="w-4 h-4 rounded bg-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{plan.audience}</div>
                    <div className="text-base font-bold text-gray-900">{plan.name}</div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {plan.name === 'Basic' && 'Perfect for individuals or agencies exploring our product\'s capabilities.'}
                  {plan.name === 'Pro' && 'Perfect for smaller agencies serving a client base of 15-20.'}
                  {plan.name === 'Enterprise' && 'Perfect for larger agencies serving a client base of 30-50 worldwide.'}
                </p>
              </div>

              {/* Price */}
              <div className="mb-4">
                {plan.label ? (
                  <span className="text-3xl font-bold text-gray-900">{plan.label}</span>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    ${billing === 'yearly' ? Math.round(plan.price! * 0.8) : plan.price}
                    <span className="text-sm font-normal text-gray-400"> / Month</span>
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 mb-5 text-sm text-center border-t border-b border-gray-100 py-4">
                <div className="text-blue-600 font-medium">{plan.credits} <span className="text-gray-400 text-xs">ⓘ</span></div>
                <div className="text-gray-500">{plan.levels} <span className="text-gray-400 text-xs">ⓘ</span></div>
                <div className="text-gray-500">{plan.domains} <span className="text-gray-400 text-xs">ⓘ</span></div>
              </div>

              {/* CTA */}
              <button
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors mb-5 ${plan.buttonStyle}`}
                onClick={() => plan.name === 'Enterprise' && navigate({ to: '/checkout' })}
              >
                {plan.button}
              </button>

              {/* Features */}
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                    <span>
                      {f.includes('10') && plan.name === 'Enterprise'
                        ? f.replace('10', '100').split('100').map((part, i) =>
                            i === 0 ? <span key={i}>{part}</span> : <><span key={i} className="text-blue-600 font-semibold">100</span>{part}</>
                          )
                        : f.includes('10') && plan.name !== 'Enterprise'
                        ? f.split('10').map((part, i) =>
                            i === 0 ? <span key={i}>{part}</span> : <><span key={i} className="text-blue-600 font-semibold">10</span>{part}</>
                          )
                        : f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500">
          If you wish to downgrade,{' '}
          <a href="mailto:support@webyes.com" className="text-blue-600 hover:underline">click here</a>{' '}
          to make a request.
        </p>
      </div>
    </div>
  )
}
