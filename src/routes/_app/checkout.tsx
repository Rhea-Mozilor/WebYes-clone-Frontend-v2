import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

export const Route = createFileRoute('/_app/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
    country: 'India',
    address: '',
    saveInfo: false,
    business: false,
  })
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4)
    return d.length >= 3 ? d.slice(0, 2) + ' / ' + d.slice(2) : d
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1800))
    setLoading(false)
    toast.success('Subscription activated! Welcome to Enterprise.')
    navigate({ to: '/dashboard' })
  }

  return (
    <div className="min-h-full bg-white flex flex-col md:flex-row">
      {/* Left — order summary */}
      <div className="bg-gray-50 md:w-[420px] shrink-0 p-8 md:p-12 flex flex-col">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-10 cursor-pointer hover:text-gray-900" onClick={() => navigate({ to: '/upgrade' })}>
          <ArrowLeft className="w-4 h-4" />
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <span className="font-medium">WebYes Limited</span>
        </div>

        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">Subscribe to Enterprise</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-gray-900">US$99.00</span>
            <span className="text-sm text-gray-400">per month</span>
          </div>
        </div>

        <div className="flex items-start justify-between py-4 border-t border-gray-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Enterprise</p>
            <p className="text-xs text-gray-400">WebYes Enterprise</p>
            <p className="text-xs text-gray-400">Billed monthly</p>
          </div>
          <span className="text-sm text-gray-800">US$99.00</span>
        </div>

        <div className="mt-4 space-y-3 border-t border-gray-200 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>US$99.00</span>
          </div>
          <button className="text-blue-600 text-xs hover:underline text-left">Add promotion code</button>
          <div className="flex justify-between text-gray-400 text-xs">
            <span>Tax <span className="text-gray-300">ⓘ</span></span>
            <span>Enter address to calculate</span>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total due today</span>
            <span>US$99.00</span>
          </div>
        </div>
      </div>

      {/* Right — payment form */}
      <div className="flex-1 p-8 md:p-12 max-w-lg">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Pay with card</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center px-3 py-2.5 gap-3">
              <span className="text-xs text-gray-400 w-10 shrink-0">Email</span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
              />
            </div>
          </div>

          {/* Card information */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Card information</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center px-3 py-2.5 border-b border-gray-200 gap-2">
                <input
                  type="text"
                  required
                  placeholder="1234 1234 1234 1234"
                  value={form.cardNumber}
                  onChange={(e) => set('cardNumber', formatCard(e.target.value))}
                  className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
                />
                <div className="flex gap-1 shrink-0">
                  <div className="w-7 h-4 bg-blue-700 rounded-sm text-white text-[8px] flex items-center justify-center font-bold">VISA</div>
                  <div className="w-7 h-4 bg-red-500 rounded-sm text-white text-[8px] flex items-center justify-center font-bold">MC</div>
                </div>
              </div>
              <div className="flex">
                <input
                  type="text"
                  required
                  placeholder="MM / YY"
                  value={form.expiry}
                  onChange={(e) => set('expiry', formatExpiry(e.target.value))}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none bg-transparent border-r border-gray-200"
                />
                <div className="flex items-center px-3 py-2.5 gap-2 flex-1">
                  <input
                    type="text"
                    required
                    placeholder="CVC"
                    value={form.cvc}
                    onChange={(e) => set('cvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="flex-1 text-sm text-gray-800 outline-none bg-transparent"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Cardholder name */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Cardholder name</label>
            <input
              type="text"
              required
              placeholder="Full name on card"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Billing address */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Billing address</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <select
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-800 outline-none bg-white border-b border-gray-200 appearance-none"
              >
                {['India', 'United States', 'United Kingdom', 'Australia', 'Canada', 'Germany', 'France', 'Singapore'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-800 outline-none bg-transparent"
              />
            </div>
            <button type="button" className="text-xs text-blue-600 hover:underline mt-1.5">Enter address manually</button>
          </div>

          {/* Checkboxes */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.saveInfo} onChange={(e) => set('saveInfo', e.target.checked)} className="mt-0.5 accent-blue-600" />
              <div>
                <p className="text-xs font-medium text-gray-800">Securely save my information for 1-click checkout</p>
                <p className="text-xs text-gray-400">Pay faster on WebYes Limited and everywhere Link is accepted.</p>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.business} onChange={(e) => set('business', e.target.checked)} className="accent-blue-600" />
            <span className="text-xs text-gray-600">I'm purchasing as a business</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-70"
          >
            {loading ? 'Processing…' : 'Subscribe'}
          </button>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            By confirming your subscription, you allow WebYes Limited to charge you for future payments in accordance with their terms. You can always cancel your subscription.
          </p>

          <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-1">
            <span>Powered by <span className="font-bold text-gray-600">stripe</span></span>
            <span>·</span>
            <a href="#" className="hover:underline">Terms</a>
            <span>·</span>
            <a href="#" className="hover:underline">Privacy</a>
          </div>
        </form>
      </div>
    </div>
  )
}
