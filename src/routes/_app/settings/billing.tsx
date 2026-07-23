import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Calendar, ChevronDown, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { getBillingSummary, getInvoices, getInvoicePdfUrl } from '../../../api/billing'
import { useUpgradeModal } from '../../../lib/UpgradeModalContext'
import type { InvoiceDateRange, InvoiceStatus } from '../../../types'
import AccessibilitySvg from '../../../components/svgicons/AccessibilityBlue.svg'
import PerformanceSvg from '../../../components/svgicons/PerformanceBlue.svg'
import QualitySvg from '../../../components/svgicons/QualityBlue.svg'
import SeoSvg from '../../../components/svgicons/SEOBlue.svg'

export const Route = createFileRoute('/_app/settings/billing')({
  component: BillingPage,
})

const DATE_RANGE_LABELS: Record<InvoiceDateRange, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '1y': 'Last year',
  all: 'All time',
}

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; border: string; text: string; label: string }> = {
  paid: { bg: '#ecfdf5', border: '#a7f3d0', text: '#059669', label: 'Paid' },
  pending: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'Pending' },
  failed: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Failed' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function BillingPage() {
  const { openUpgradeModal } = useUpgradeModal()
  const [dateRange, setDateRange] = useState<InvoiceDateRange>('30d')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [dateFilter, setDateFilter] = useState(false)

  const { data: summary } = useQuery({ queryKey: ['billing-summary'], queryFn: getBillingSummary })
  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices', dateRange, page],
    queryFn: () => getInvoices(dateRange, page, pageSize),
  })

  const planName = summary?.plan_name ?? 'free'
  const planNameCap = planName.charAt(0).toUpperCase() + planName.slice(1)
  const planLabel = planName === 'free' ? 'Free' : `${planNameCap} ${summary?.billing_period === 'annually' ? 'Yearly' : 'Monthly'}`
  const planTitle = `WebYes Suite - ${planLabel}`
  const planPrice = summary ? `$${summary.price}` : '$0'
  const nextBilling = summary?.expires_in_days != null
    ? formatDate(new Date(Date.now() + summary.expires_in_days * 86400000).toISOString())
    : null
  const creditsTotal = summary?.credits_total ?? 0
  const creditsLeft = summary?.credits_balance ?? 0
  const creditsUsed = Math.max(creditsTotal - creditsLeft, 0)
  const creditsRawPct = creditsTotal > 0 ? (creditsLeft / creditsTotal) * 100 : 0
  // Leave a visible sliver of the unfilled track whenever any credits have been used,
  // even if the used amount is small enough that the rounded percentage still reads ~100%.
  const creditsPct = creditsUsed > 0 ? Math.min(creditsRawPct, 97) : 100
  const isCancelled = summary?.status === 'cancelled'
  const showCancelledBadge = false

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.44px]">Billing &amp; Invoices</h1>

      {/* Subscription card */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
        {/* Top row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-2.5">
            <span className="text-[16px] font-bold text-[#2e3240]">{planTitle}</span>
            {showCancelledBadge && (
              <span className="px-2.5 py-1 rounded-full bg-[#f3f4f6] text-[11px] font-bold text-[#6b7280] uppercase tracking-wide">
                Cancelled
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-[22px] font-bold text-[#2e3240]">{planPrice}</div>
            {nextBilling && (
              <div className="flex items-center gap-1.5 text-[12px] text-[#73767f] justify-end mt-0.5">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="#73767f" strokeWidth="1.2" />
                  <path d="M1 5h12" stroke="#73767f" strokeWidth="1.2" />
                  <path d="M4 1v2M10 1v2" stroke="#73767f" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {isCancelled ? `Expires on: ${nextBilling}` : `Next billing date: ${nextBilling}`}
              </div>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center px-6 py-5 gap-6 min-w-0">
          {/* It includes */}
          <div>
            <p className="text-[12px] font-medium text-[#73767f] mb-3">It includes</p>
            <div className="flex items-center gap-2">
              {[AccessibilitySvg, PerformanceSvg, QualitySvg, SeoSvg].map((src, i) => (
                <div key={i} className="w-9 h-9 rounded-[8px] bg-[#eef2ff] flex items-center justify-center">
                  <img src={src} alt="" className="w-5 h-5" />
                </div>
              ))}
            </div>
          </div>

          <div className="w-px h-11 bg-[#e5e7eb] shrink-0" />

          {/* Payment method — only once a real payment has actually been made */}
          {summary?.payment_method && (
            <>
              <div>
                <p className="text-[12px] font-medium text-[#73767f] mb-3">Payment method</p>
                <div className="flex items-center gap-2.5 bg-white border border-[#e5e7eb] rounded-[8px] px-3 py-2.5 w-fit">
                  <div className="bg-[#1a1f71] rounded px-1.5 py-0.5">
                    <span className="text-white text-[10px] font-bold italic tracking-wide">
                      {summary.payment_method.brand.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#2e3240]">•••• {summary.payment_method.last4}</div>
                    <div className="text-[11px] text-[#73767f]">
                      Expires {String(summary.payment_method.exp_month).padStart(2, '0')}/{String(summary.payment_method.exp_year).slice(-2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-px h-11 bg-[#e5e7eb] shrink-0" />
            </>
          )}

          {/* Credit usage */}
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[#73767f] mb-3">Credit usage</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-[20px] font-bold text-[#2e3240] leading-none">{creditsLeft}</span>
              <span className="text-[13px] text-[#73767f] whitespace-nowrap">/{creditsTotal} credits left</span>
            </div>
            <div className="h-[6px] bg-gray-200 rounded-full w-[160px] overflow-hidden">
              <div className="h-full bg-[#2e3240] rounded-full" style={{ width: `${creditsPct}%` }} />
            </div>
          </div>

          <div className="flex-1" />

          {isCancelled || planName === 'free' ? (
            <button
              onClick={openUpgradeModal}
              className={
                isCancelled
                  ? 'shrink-0 px-5 py-2.5 bg-[#f97316] hover:bg-[#ea580c] text-white text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap'
                  : 'shrink-0 px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap'
              }
            >
              Upgrade
            </button>
          ) : (
            <Link
              to="/upgrade"
              className="shrink-0 px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap"
            >
              Manage Subscription
            </Link>
          )}
        </div>
      </div>

      {/* Promo banner */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] border-l-[5px] border-l-[#0b66e4] flex items-center justify-between px-7 py-6 gap-5">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#eef2ff] flex items-center justify-center shrink-0">
            <img src={AccessibilitySvg} alt="" className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[18px] font-bold text-[#2e3240]">Want just the Accessibility score?</p>
            <p className="text-[15px] text-[#73767f]">Build a more inclusive experience for all visitors.</p>
          </div>
        </div>
        <button className="shrink-0 px-7 py-3.5 border border-[#0b66e4] text-[#0b66e4] hover:bg-[#eef2ff] text-[15px] font-semibold rounded-[6px] transition-colors whitespace-nowrap">
          Try for free
        </button>
      </div>

      {/* Invoice history */}
      <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
          <span className="text-[16px] font-bold text-[#2e3240]">Invoice history</span>
          <div className="flex items-center gap-2">
            {/* Date filter */}
            <div className="relative">
              <button
                onClick={() => setDateFilter(!dateFilter)}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-medium text-[#2e3240] hover:bg-[#f9fafb] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#73767f]" />
                {DATE_RANGE_LABELS[dateRange]}
                <ChevronDown className="w-3.5 h-3.5 text-[#73767f]" />
              </button>
              {dateFilter && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-[6px] border border-[#e5e7eb] shadow-lg z-10 overflow-hidden">
                  {(Object.keys(DATE_RANGE_LABELS) as InvoiceDateRange[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setDateRange(r); setPage(1); setDateFilter(false) }}
                      className="block w-full text-left px-3 py-2 text-[13px] text-[#2e3240] hover:bg-[#f9fafb] transition-colors"
                    >
                      {DATE_RANGE_LABELS[r]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-[#eef2ff] border-b border-[#e0e7ff]">
              {['Invoice id', 'Product', 'Plan', 'Amount', 'Date', 'Status', 'Action'].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-[12px] font-semibold text-[#73767f] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(invoicesData?.items ?? []).map((inv) => {
              const style = STATUS_STYLES[inv.status]
              return (
                <tr key={inv.invoice_id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#fafafa] transition-colors">
                  <td className="px-5 py-4 text-[13px] text-[#2e3240] font-mono">{inv.invoice_id}</td>
                  <td className="px-5 py-4 text-[13px] text-[#2e3240]">Webyes Suite</td>
                  <td className="px-5 py-4 text-[13px] text-[#2e3240]">{inv.plan}</td>
                  <td className="px-5 py-4 text-[13px] text-[#2e3240] font-medium">${inv.amount}</td>
                  <td className="px-5 py-4 text-[13px] text-[#2e3240]">{formatDate(inv.date)}</td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[12px] font-medium"
                      style={{ background: style.bg, borderColor: style.border, color: style.text }}
                    >
                      {inv.status === 'paid' && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3L9 1" stroke={style.text} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {style.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={async () => {
                        try {
                          const url = await getInvoicePdfUrl(inv.invoice_id)
                          window.open(url, '_blank')
                        } catch (err: unknown) {
                          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
                          toast.error(detail ?? 'Could not open invoice')
                        }
                      }}
                      className="text-[#0b66e4] hover:text-[#0952c6] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
