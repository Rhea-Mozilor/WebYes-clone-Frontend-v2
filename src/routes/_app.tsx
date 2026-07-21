import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LayoutGrid,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight,
  // HelpCircle,
  Monitor,
  Smartphone,
  LogOut,
  Search,
  Plus,
  X,
  History,
} from 'lucide-react'
import AccessibilitySvg from '../components/svgicons/Accessibility.svg'
import PerformanceSvg from '../components/svgicons/Performance.svg'
import QualitySvg from '../components/svgicons/Quality.svg'
import SeoSvg from '../components/svgicons/SEO.svg'
import ScanModalGif from '../components/svgicons/scanmodal.gif'
import UpgradeSvg from '../components/svgicons/upgrade.svg'

const AccIcon = ({ className }: { className?: string }) => <img src={AccessibilitySvg} className={className} alt="" />
const PerfIcon = ({ className }: { className?: string }) => <img src={PerformanceSvg} className={className} alt="" />
const QualIcon = ({ className }: { className?: string }) => <img src={QualitySvg} className={className} alt="" />
const SeoIcon = ({ className }: { className?: string }) => <img src={SeoSvg} className={className} alt="" />
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'
import { getMe, logout } from '../api/auth'
import { getBillingCredits } from '../api/billing'
import { listWebsites } from '../api/websites'
import { listOrganisations } from '../api/organisations'
import { AddNewWebsiteModal } from '../components/AddNewWebsiteModal'
import { triggerScan, getScanJob, cancelScan, getActiveScan } from '../api/scans'
import { useAuthStore } from '../store/authStore'
import { useSiteStore } from '../store/siteStore'
import { BgScanContext } from '../lib/BgScanContext'
import { ScanModalContext, type ScanArgs } from '../lib/ScanModalContext'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!localStorage.getItem('access_token')) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

// ---------------------------------------------------------------------------
// Scan progress modal
// ---------------------------------------------------------------------------

function ScanProgressModal({
  desktopJobId,
  mobileJobId,
  websiteUrl,
  websiteName,
  websiteId,
  visible,
  onHide,
  onCancel,
  onComplete,
}: {
  desktopJobId: string | null
  mobileJobId: string | null
  websiteUrl: string
  websiteName: string
  websiteId: string
  visible: boolean
  onHide: () => void
  onCancel: () => void
  onComplete: (scanId: string) => void
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setScanForWebsite = useSiteStore((s) => s.setScanForWebsite)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  async function handleCancel() {
    setCancelling(true)
    try {
      const jobs = [desktopJobId, mobileJobId].filter(Boolean) as string[]
      await Promise.allSettled(jobs.map(id => cancelScan(id)))
    } finally {
      setCancelling(false)
      onCancel()
      void qc.invalidateQueries({ queryKey: ['billing-credits'] })
    }
  }

  const { data: desktopJob } = useQuery({
    queryKey: ['scan-progress', desktopJobId],
    queryFn: () => getScanJob(desktopJobId!),
    enabled: !!desktopJobId,
    refetchInterval: (query) => {
      const d = query.state.data as { status?: string; current_url?: string | null; pages_scanned?: number } | undefined
      if (d?.status === 'completed' || d?.status === 'failed' || d?.status === 'cancelled') return false
      if (d?.current_url === null && (d?.pages_scanned ?? 0) > 0) return 1_000
      return 3_000
    },
  })

  const { data: mobileJob } = useQuery({
    queryKey: ['scan-progress', mobileJobId],
    queryFn: () => getScanJob(mobileJobId!),
    enabled: !!mobileJobId,
    refetchInterval: (query) => {
      const d = query.state.data as { status?: string; current_url?: string | null; pages_scanned?: number } | undefined
      if (d?.status === 'completed' || d?.status === 'failed' || d?.status === 'cancelled') return false
      if (d?.current_url === null && (d?.pages_scanned ?? 0) > 0) return 1_000
      return 3_000
    },
  })

  const isDone = (j: typeof desktopJob) => j?.status === 'completed' || j?.status === 'failed' || j?.status === 'cancelled'
  const bothComplete =
    (!desktopJobId || isDone(desktopJob)) && (!mobileJobId || isDone(mobileJob))

  const completedRef = useRef(false)
  useEffect(() => {
    if (bothComplete && !completedRef.current) {
      completedRef.current = true
      const scanId = desktopJobId ?? mobileJobId
      if (scanId) onComplete(scanId)
    }
  }, [bothComplete, desktopJobId, mobileJobId, onComplete])

  const pagesScanned = Math.max(
    desktopJob?.pages_scanned ?? 0,
    mobileJob?.pages_scanned ?? 0
  )

  const prevPagesRef = useRef(0)
  useEffect(() => {
    if (pagesScanned > prevPagesRef.current) {
      prevPagesRef.current = pagesScanned
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
  }, [pagesScanned, qc])

  function handleExploreDashboard() {
    const scanId = desktopJobId ?? mobileJobId
    if (scanId) setScanForWebsite(websiteId, scanId)
    onHide()
    navigate({ to: '/dashboard' })
  }

  function handleViewResults() {
    onCancel()
    navigate({ to: '/dashboard' })
  }

  // ── Completed / Failed state ─────────────────────────────────────────────
  if (bothComplete) {
    const hasFailed =
      desktopJob?.status === 'failed' || mobileJob?.status === 'failed'

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-sm shadow-2xl w-full max-w-sm overflow-hidden">
          {/* X button */}
          <div className="flex justify-end px-4 pt-4">
            <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {hasFailed ? (
            <>
              {/* Failed illustration */}
              <div className="mx-5 mb-5 rounded-sm bg-red-50 flex items-center justify-center py-8 relative">
                <svg viewBox="0 0 220 150" className="w-56" fill="none">
                  <rect x="30" y="10" width="160" height="110" rx="8" fill="#FEE2E2" />
                  <rect x="30" y="10" width="160" height="24" rx="8" fill="#991B1B" />
                  <rect x="44" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="90" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="136" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                  <rect x="44" y="80" width="130" height="10" rx="3" fill="#FCA5A5" />
                  <rect x="44" y="96" width="95" height="10" rx="3" fill="#FCA5A5" />
                </svg>
                {/* Red X circle */}
                <div className="absolute bottom-6 left-12 w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>

              {/* Failed text */}
              <div className="px-6 pb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Scan failed</h2>
                <p className="text-sm text-gray-600 mb-6">
                  The scan for <span className="font-bold text-gray-900">{websiteUrl}</span> could not be completed. Please try running the scan again.
                </p>
                <button
                  onClick={onCancel}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Success illustration */}
              <div className="mx-5 mb-5 rounded-sm bg-blue-100 flex items-center justify-center py-8 relative">
                <svg viewBox="0 0 220 150" className="w-56" fill="none">
                  <rect x="30" y="10" width="160" height="110" rx="8" fill="#BFDBFE" />
                  <rect x="30" y="10" width="160" height="24" rx="8" fill="#3730A3" />
                  <rect x="44" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="90" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="136" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                  <rect x="44" y="80" width="130" height="10" rx="3" fill="#DDD6FE" />
                  <rect x="44" y="96" width="95" height="10" rx="3" fill="#DDD6FE" />
                </svg>
                {/* Green checkmark */}
                <div className="absolute bottom-6 left-12">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {/* Accessibility circle */}
                <div className="absolute bottom-4 right-14 w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center shadow">
                  <svg className="w-6 h-6 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="4" r="1.5" />
                    <path d="M12 7c-2.8 0-5 .8-5 .8l1 3.2h3v7h2v-7h3l1-3.2S14.8 7 12 7z" />
                  </svg>
                </div>
              </div>

              {/* Success text */}
              <div className="px-6 pb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Your website scan is complete</h2>
                <p className="text-sm text-gray-600 mb-6">
                  The audit for <span className="font-bold text-gray-900">{websiteUrl}</span> is ready - review your results and fix the issues.
                </p>
                <button
                  onClick={handleViewResults}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-sm transition-colors"
                >
                  View results
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Build display list: completed pages (green tick) + active current_url (spinner)
  const doneUrls = new Set<string>()
  const displayPages: { url: string; done: boolean }[] = []
  for (const job of [desktopJob, mobileJob]) {
    for (const p of job?.pages ?? []) {
      if (!doneUrls.has(p.url)) {
        doneUrls.add(p.url)
        displayPages.push({ url: p.url, done: true })
      }
    }
  }
  for (const job of [desktopJob, mobileJob]) {
    const cur = job?.current_url
    if (cur && !doneUrls.has(cur)) {
      displayPages.push({ url: cur, done: false })
    }
  }

  // ── In-progress state ────────────────────────────────────────────────────
  if (!visible) return null

  const displayName = websiteName || websiteUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div
        className="relative bg-white rounded-[12px] w-full flex flex-col gap-5"
        style={{ maxWidth: 886, boxShadow: '0px 0px 20px 0px rgba(16,6,57,0.13)' }}
      >
        {/* Close button */}
        <button
          onClick={onHide}
          disabled={pagesScanned === 0}
          className="absolute top-2 right-3 p-1.5 text-[#585b66] hover:text-[#141414] transition-colors z-10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X size={18} />
        </button>

        <div className="px-8 pt-8 pb-0 flex flex-col gap-5">

          {/* Main bordered content box */}
          <div className="border border-[#adbbd8] rounded-[8px] flex overflow-hidden" style={{ minHeight: 324 }}>

            {/* Left: scanning info */}
            <div className="flex-1 py-8 pl-9 pr-6 flex flex-col min-w-0">
              <h2
                className="text-[24px] font-semibold text-[#141414] leading-[32px]"
                style={{ letterSpacing: '-0.2px' }}
              >
                {displayName} scanning...
              </h2>

              <p className="text-[13px] text-[#73767f] mt-2 leading-[19px]">
                Your scan profile '{displayName}' has been saved. You can access it later from the Scan Profiles menu.
              </p>

              {/* Pages scanned count */}
              <div className="flex items-center gap-2 mt-5">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
                  <path d="M2 7V3.5A1.5 1.5 0 0 1 3.5 2H7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 2h3.5A1.5 1.5 0 0 1 20 3.5V7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M20 15v3.5A1.5 1.5 0 0 1 18.5 20H15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 20H3.5A1.5 1.5 0 0 1 2 18.5V15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="2" y1="11" x2="20" y2="11" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] font-medium text-[#0a165b]">
                  {pagesScanned} pages scanned
                </span>
              </div>

              {/* Currently scanning bar */}
              <div className="mt-5 bg-[#e2e9f3] px-5 py-2">
                <span className="text-[13px] font-medium text-[#0a165b]">Currently scanning :</span>
              </div>

              {/* URL list */}
              <div
                className="flex-1 overflow-y-auto max-h-[130px] pr-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#323232 transparent' }}
              >
                {displayPages.length === 0 ? (
                  <div className="flex items-center gap-3 py-2.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                      <circle cx="8" cy="8" r="7" stroke="#adbbd8" strokeWidth="1.5" />
                      <path d="M8 1a7 7 0 0 1 7 7" stroke="#0b66e4" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[13px] text-[#73767f]">Waiting for scanner...</span>
                  </div>
                ) : displayPages.map((p) => (
                  <div key={p.url} className="flex items-center justify-between gap-3 py-2 border-b border-[#f0f0f0] last:border-0">
                    <span className="text-[13px] text-black truncate">{p.url}</span>
                    {p.done ? (
                      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="shrink-0">
                        <path d="M1.5 7l5 5L16.5 1.5" stroke="#219653" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                        <circle cx="8" cy="8" r="7" stroke="#adbbd8" strokeWidth="1.5" />
                        <path d="M8 1a7 7 0 0 1 7 7" stroke="#0b66e4" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-px bg-[#adbbd8] self-stretch shrink-0" />

            {/* Right: animated illustration */}
            <div className="w-[260px] shrink-0 flex items-center justify-center p-6">
              <img
                src={ScanModalGif}
                alt="Scanning illustration"
                className="w-[210px] h-[210px] object-contain"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="border border-[#adbbd8] rounded-[6px] px-8 py-5">
            <p className="text-[14px] text-[#2e3240] leading-[24px]">
              The scanning process is ongoing and may take minutes or even hours depending on the size of your website. Meanwhile, you can:
            </p>
            <ul className="list-disc pl-5 mt-2 text-[14px] text-[#2e3240]">
              <li className="leading-[28px]">Explore the dashboard</li>
              <li className="leading-[28px]">We'll notify you via email, once the scan is completed</li>
            </ul>
          </div>
        </div>

        {/* Cancel confirmation modal */}
        {confirmCancelOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
              <h2 className="text-[20px] font-bold text-gray-900 mb-4">Cancel scanning</h2>
              <p className="text-[15px] text-gray-400 leading-relaxed mb-10">
                Are you sure you want to stop scanning? Any URLs scanned so far will still use up your credits
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmCancelOpen(false); handleCancel() }}
                  disabled={cancelling}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel scan'}
                </button>
                <button
                  onClick={() => setConfirmCancelOpen(false)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-[15px] font-medium text-white transition-colors"
                >
                  Continue scan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 pb-7">
          <button
            onClick={() => setConfirmCancelOpen(true)}
            disabled={cancelling}
            className="text-[14px] font-medium text-[#585b66] hover:text-[#141414] transition-colors disabled:opacity-50"
            style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.28px' }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel scan'}
          </button>
          <button
            onClick={handleExploreDashboard}
            disabled={pagesScanned === 0}
            className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-[4px] transition-colors"
            style={{ letterSpacing: '-0.28px' }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onboarding scan detail modal (shown when user clicks "Scan details" in header)
// ---------------------------------------------------------------------------

function OnboardingScanModal({
  jobId,
  url,
  onClose,
  onCancel,
}: {
  jobId: string
  url: string
  onClose: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const websiteId = useSiteStore((s) => s.websiteId)
  const setScanForWebsite = useSiteStore((s) => s.setScanForWebsite)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)

  const { data: job } = useQuery({
    queryKey: ['onboarding-scan', jobId],
    queryFn: () => getScanJob(jobId),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'completed' || s === 'failed' || s === 'cancelled' ? false : 3_000
    },
  })

  const pages = job?.pages ?? []
  const pagesScanned = job?.pages_scanned ?? pages.length
  const currentUrl = job?.current_url ?? null

  const prevPagesOnboardRef = useRef(0)
  useEffect(() => {
    if (pagesScanned > prevPagesOnboardRef.current) {
      prevPagesOnboardRef.current = pagesScanned
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    }
  }, [pagesScanned, qc])

  let name = url
  try { name = new URL(url).hostname.replace(/^www\./, '') } catch { /* ok */ }

  async function handleCancel() {
    setCancelling(true)
    try { await cancelScan(jobId) } catch { /* ok */ }
    onCancel()
    void qc.invalidateQueries({ queryKey: ['billing-credits'] })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
      <div
        className="relative bg-white rounded-[12px] w-full flex flex-col gap-5"
        style={{ maxWidth: 886, boxShadow: '0px 0px 20px 0px rgba(16,6,57,0.13)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={pagesScanned === 0}
          className="absolute top-2 right-3 p-1.5 text-[#585b66] hover:text-[#141414] transition-colors z-10 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <X size={18} />
        </button>

        <div className="px-8 pt-8 pb-0 flex flex-col gap-5">

          <div className="border border-[#adbbd8] rounded-[8px] flex overflow-hidden" style={{ minHeight: 324 }}>
            <div className="flex-1 py-8 pl-9 pr-6 flex flex-col min-w-0">
              <h2 className="text-[24px] font-semibold text-[#141414] leading-[32px]" style={{ letterSpacing: '-0.2px' }}>
                {name} scanning...
              </h2>
              <p className="text-[13px] text-[#73767f] mt-2 leading-[19px]">
                Your scan profile '{name}' has been saved. You can access it later from the Scan Profiles menu.
              </p>
              <div className="flex items-center gap-2 mt-5">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0">
                  <path d="M2 7V3.5A1.5 1.5 0 0 1 3.5 2H7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 2h3.5A1.5 1.5 0 0 1 20 3.5V7" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M20 15v3.5A1.5 1.5 0 0 1 18.5 20H15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M7 20H3.5A1.5 1.5 0 0 1 2 18.5V15" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="2" y1="11" x2="20" y2="11" stroke="#0a165b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="text-[13px] font-medium text-[#0a165b]">{pagesScanned} pages scanned</span>
              </div>
              <div className="mt-5 bg-[#e2e9f3] px-5 py-2">
                <span className="text-[13px] font-medium text-[#0a165b]">Currently scanning :</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[130px] pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#323232 transparent' }}>
                {pages.length === 0 && !currentUrl ? (
                  <div className="flex items-center gap-3 py-2.5">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                      <circle cx="8" cy="8" r="7" stroke="#adbbd8" strokeWidth="1.5" />
                      <path d="M8 1a7 7 0 0 1 7 7" stroke="#0b66e4" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[13px] text-[#73767f]">Waiting for scanner...</span>
                  </div>
                ) : (
                  <>
                    {pages.map((p) => (
                      <div key={p.url} className="flex items-center justify-between gap-3 py-2 border-b border-[#f0f0f0] last:border-0">
                        <span className="text-[13px] text-black truncate">{p.url}</span>
                        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="shrink-0">
                          <path d="M1.5 7l5 5L16.5 1.5" stroke="#219653" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    ))}
                    {currentUrl && !pages.find(p => p.url === currentUrl) && (
                      <div key={currentUrl} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-[13px] text-black truncate">{currentUrl}</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                          <circle cx="8" cy="8" r="7" stroke="#adbbd8" strokeWidth="1.5" />
                          <path d="M8 1a7 7 0 0 1 7 7" stroke="#0b66e4" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="w-px bg-[#adbbd8] self-stretch shrink-0" />
            <div className="w-[260px] shrink-0 flex items-center justify-center p-6">
              <img src={ScanModalGif} alt="Scanning illustration" className="w-[210px] h-[210px] object-contain" />
            </div>
          </div>

          <div className="border border-[#adbbd8] rounded-[6px] px-8 py-5">
            <p className="text-[14px] text-[#2e3240] leading-[24px]">
              The scanning process is ongoing and may take minutes or even hours depending on the size of your website. Meanwhile, you can:
            </p>
            <ul className="list-disc pl-5 mt-2 text-[14px] text-[#2e3240]">
              <li className="leading-[28px]">Explore the dashboard</li>
              <li className="leading-[28px]">We'll notify you via email, once the scan is completed</li>
            </ul>
          </div>
        </div>

        {confirmCancelOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
              <h2 className="text-[20px] font-bold text-gray-900 mb-4">Cancel scanning</h2>
              <p className="text-[15px] text-gray-400 leading-relaxed mb-10">
                Are you sure you want to stop scanning? Any URLs scanned so far will still use up your credits
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmCancelOpen(false); handleCancel() }}
                  disabled={cancelling}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel scan'}
                </button>
                <button
                  onClick={() => setConfirmCancelOpen(false)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-[15px] font-medium text-white transition-colors"
                >
                  Continue scan
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 px-8 pb-7">
          <button
            onClick={() => setConfirmCancelOpen(true)}
            disabled={cancelling}
            className="text-[14px] font-medium text-[#585b66] hover:text-[#141414] transition-colors disabled:opacity-50"
            style={{ letterSpacing: '-0.28px' }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel scan'}
          </button>
          <button
            onClick={() => {
              if (websiteId) setScanForWebsite(websiteId, jobId)
              onClose()
            }}
            disabled={pagesScanned === 0}
            className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-[4px] transition-colors"
            style={{ letterSpacing: '-0.28px' }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

function AppLayout() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { clearAuth } = useAuthStore()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: billingCredits } = useQuery({ queryKey: ['billing-credits'], queryFn: getBillingCredits })
  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: listWebsites })
  const { data: orgs = [] } = useQuery({ queryKey: ['organisations'], queryFn: listOrganisations })
  const { websiteId, setWebsiteId, strategy, setStrategy, setScanForWebsite, activeScanJob, setActiveScanJob } = useSiteStore()
  const location = useRouterState({ select: (s) => s.location.pathname })

  const [websiteDrop, setWebsiteDrop] = useState(false)
  const [addWebsiteModalOpen, setAddWebsiteModalOpen] = useState(false)
  const [strategyDrop, setStrategyDrop] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [scanJobs, setScanJobs] = useState<{ desktopJobId: string | null; mobileJobId: string | null; url: string; websiteName: string; websiteId: string } | null>(null)
  const [scanModalVisible, setScanModalVisible] = useState(false)
  const [scanJobsDone, setScanJobsDone] = useState(false)
  const [confirmScanOpen, setConfirmScanOpen] = useState(false)
  const [scanDetailOpen, setScanDetailOpen] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState<{ failed: boolean } | null>(null)
  const [viewerErrorOpen, setViewerErrorOpen] = useState(false)
  const websiteRef = useRef<HTMLDivElement>(null)
  const strategyRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const creditsRef = useRef<HTMLDivElement>(null)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const handledJobRef = useRef<string | null>(null)
  const recoveredJobRef = useRef<string | null>(null)

  // Poll onboarding scan job running in background (user clicked "Back to Dashboard")
  const { data: onboardingJob } = useQuery({
    queryKey: ['onboarding-scan', activeScanJob?.jobId],
    queryFn: () => getScanJob(activeScanJob!.jobId),
    enabled: !!activeScanJob?.jobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'completed' || s === 'failed' || s === 'cancelled' ? false : 3_000
    },
  })

  useEffect(() => {
    if (!activeScanJob?.jobId) return
    if (onboardingJob?.status !== 'completed' && onboardingJob?.status !== 'failed' && onboardingJob?.status !== 'cancelled') return
    if (handledJobRef.current === activeScanJob.jobId) return
    handledJobRef.current = activeScanJob.jobId
    if (onboardingJob.status === 'completed' && websiteId) {
      setScanForWebsite(websiteId, activeScanJob.jobId)
    }
    if (onboardingJob.status !== 'cancelled') {
      setOnboardingComplete({ failed: onboardingJob.status === 'failed' })
    }
    setActiveScanJob(null)
    setScanDetailOpen(false)
  }, [onboardingJob?.status, activeScanJob?.jobId, websiteId, setScanForWebsite, setActiveScanJob])

  // Website dropdown state
  const [siteSearch, setSiteSearch] = useState('')

  const filteredWebsites = websites.filter((w) => {
    const q = siteSearch.toLowerCase()
    return !q || w.name.toLowerCase().includes(q) || w.url.toLowerCase().includes(q)
  })

  // auto-select first website
  useEffect(() => {
    if (websites.length && !websiteId) setWebsiteId(websites[0].id)
  }, [websites, websiteId, setWebsiteId])

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (websiteRef.current && !websiteRef.current.contains(e.target as Node)) setWebsiteDrop(false)
      if (strategyRef.current && !strategyRef.current.contains(e.target as Node)) setStrategyDrop(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false)
      if (creditsRef.current && !creditsRef.current.contains(e.target as Node)) setCreditsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedWebsite = websites.find((w) => w.id === websiteId)

  // On login/load: always check backend for an in-progress scan.
  // staleTime: Infinity ensures this runs once per session (not on re-render).
  const { data: activeScanData } = useQuery({
    queryKey: ['active-scan', websiteId],
    queryFn: () => getActiveScan(websiteId!),
    enabled: !!websiteId,
    staleTime: Infinity,
    retry: false,
  })
  useEffect(() => {
    if (!activeScanData?.scan_job_id) return
    if (activeScanData.status === 'completed' || activeScanData.status === 'cancelled' || activeScanData.status === 'failed') return
    // recoveredJobRef ensures we only set activeScanJob once per job per session
    if (recoveredJobRef.current === activeScanData.scan_job_id) return
    recoveredJobRef.current = activeScanData.scan_job_id
    setActiveScanJob({ jobId: activeScanData.scan_job_id, url: selectedWebsite?.url ?? '' })
  }, [activeScanData, selectedWebsite, setActiveScanJob])

  const openScanModal = useCallback((args: ScanArgs) => {
    setScanJobs(args)
    setScanJobsDone(false)
    setScanModalVisible(true)
  }, [])

  const showViewerError = useCallback(() => setViewerErrorOpen(true), [])

  // True while any scan is in progress (onboarding background scan OR rescan)
  const isScanRunning = !!activeScanJob || (!!scanJobs && !scanJobsDone)

  const scanMutation = useMutation({
    mutationFn: () => triggerScan(websiteId!),
    onSuccess: (job) => {
      const desktopId = job.desktop_scan_job_id ?? (strategy === 'desktop' ? job.scan_job_id : null) ?? null
      const mobileId = job.mobile_scan_job_id ?? (strategy === 'mobile' ? job.scan_job_id : null) ?? null
      if (!desktopId && !mobileId) { toast.error('Scan started but could not get job ID'); return }
      setScanJobs({
        desktopJobId: desktopId ? String(desktopId) : null,
        mobileJobId: mobileId ? String(mobileId) : null,
        url: selectedWebsite?.url ?? '',
        websiteName: selectedWebsite?.name ?? '',
        websiteId: websiteId!,
      })
      setScanJobsDone(false)
      setScanModalVisible(true)
      void qc.invalidateQueries({ queryKey: ['billing-credits'] })
    },
    onError: (err: unknown) => {
      if ((err as { response?: { status?: number } })?.response?.status === 403) {
        setViewerErrorOpen(true)
      } else {
        toast.error('Could not start scan')
      }
    },
  })

  async function handleLogout() {
    try { await logout() } catch { /* ok */ }
    clearAuth()
    navigate({ to: '/login' })
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'

  const sideLinks = [
    { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  ]

  const categoryLinks: { to: string | null; icon: React.ElementType; label: string }[] = [
    { to: '/accessibility', icon: AccIcon, label: 'Accessibility' },
    { to: '/performance', icon: PerfIcon, label: 'Performance' },
    { to: '/quality', icon: QualIcon, label: 'Quality' },
    { to: '/seo', icon: SeoIcon, label: 'SEO' },
  ]

  return (
    <ScanModalContext.Provider value={{ openScanModal, showViewerError }}>
    <BgScanContext.Provider value={{ bgScan: activeScanJob, setBgScan: setActiveScanJob }}>
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* ── Rescan confirmation modal ──────────────────────────────── */}
      {confirmScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
            <button
              onClick={() => setConfirmScanOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <h2 className="text-[20px] font-bold text-gray-900 mb-5">Finalise rescan details</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-10">
              You are about to rescan the URLs from your previous scan. Would you like to proceed?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmScanOpen(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmScanOpen(false); scanMutation.mutate() }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-[15px] font-medium text-white transition-colors"
              >
                Scan now
              </button>
            </div>
          </div>
        </div>
      )}

      {scanJobs && (
        <ScanProgressModal
          desktopJobId={scanJobs.desktopJobId}
          mobileJobId={scanJobs.mobileJobId}
          websiteUrl={scanJobs.url}
          websiteName={scanJobs.websiteName}
          websiteId={scanJobs.websiteId}
          visible={scanModalVisible}
          onHide={() => setScanModalVisible(false)}
          onCancel={() => { setScanJobs(null); setScanModalVisible(false); setScanJobsDone(false) }}
          onComplete={(scanId) => { setScanForWebsite(scanJobs.websiteId, scanId); setScanJobsDone(true) }}
        />
      )}

      {/* ── Onboarding scan detail modal (opened via "Scan details" header button) ── */}
      {scanDetailOpen && activeScanJob && (
        <OnboardingScanModal
          jobId={activeScanJob.jobId}
          url={activeScanJob.url}
          onClose={() => setScanDetailOpen(false)}
          onCancel={() => { setActiveScanJob(null); setScanDetailOpen(false) }}
        />
      )}

      {/* ── Onboarding scan completion modal (fires when scan finishes in background) ── */}
      {onboardingComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-sm shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-end px-4 pt-4">
              <button onClick={() => setOnboardingComplete(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {onboardingComplete.failed ? (
              <>
                <div className="mx-5 mb-5 rounded-sm bg-red-50 flex items-center justify-center py-8 relative min-h-[180px]">
                  <svg viewBox="0 0 220 150" className="w-48" fill="none">
                    <rect x="30" y="10" width="160" height="110" rx="8" fill="#FEE2E2" />
                    <rect x="30" y="10" width="160" height="24" rx="8" fill="#991B1B" />
                    <rect x="44" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                    <rect x="90" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                    <rect x="136" y="44" width="38" height="28" rx="4" fill="#FECACA" />
                    <rect x="44" y="80" width="130" height="10" rx="3" fill="#FCA5A5" />
                    <rect x="44" y="96" width="95" height="10" rx="3" fill="#FCA5A5" />
                  </svg>
                  <div className="absolute bottom-5 left-10 w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                </div>
                <div className="px-6 pb-7">
                  <h2 className="text-[20px] font-bold text-gray-900 mb-2">Scan failed</h2>
                  <p className="text-sm text-gray-600 mb-6">The scan could not be completed. Please try running the scan again.</p>
                  <button onClick={() => setOnboardingComplete(null)} className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-lg transition-colors">Close</button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-5 mb-5 rounded-sm bg-[#e8eeff] flex items-center justify-center py-8 relative min-h-[180px]">
                  <svg viewBox="0 0 220 150" className="w-48" fill="none">
                    <rect x="30" y="10" width="160" height="110" rx="8" fill="#BFDBFE" />
                    <rect x="30" y="10" width="160" height="24" rx="8" fill="#3730A3" />
                    <rect x="44" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                    <rect x="90" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                    <rect x="136" y="44" width="38" height="28" rx="4" fill="#C7D2FE" />
                    <rect x="44" y="80" width="130" height="10" rx="3" fill="#DDD6FE" />
                    <rect x="44" y="96" width="95" height="10" rx="3" fill="#DDD6FE" />
                  </svg>
                  <div className="absolute bottom-5 left-10">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
                <div className="px-6 pb-7">
                  <h2 className="text-[20px] font-bold text-gray-900 mb-2">Your website scan is complete</h2>
                  <p className="text-sm text-gray-600 mb-6">The audit is ready — review your results and fix the issues.</p>
                  <button onClick={() => { setOnboardingComplete(null); navigate({ to: '/dashboard' }) }} className="w-full py-3 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-sm font-semibold rounded-lg transition-colors">View results</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Full-width header ─────────────────────────────────────── */}
      <header className="h-16 bg-white border-b border-zinc-200 flex items-center pl-6 pr-5 z-20 shrink-0 w-full gap-0">
          <span className="font-bold text-3xl text-gray-900 hidden sm:block mr-[34px]">
            <span className="text-blue-600">W</span>ebYes
          </span>

          {location !== '/onboarding' && location !== '/upgrade' && (<>
          {/* Divider after logo */}
          <div className="w-px h-8 bg-slate-300 shrink-0 hidden sm:block" />

          {/* Website selector */}
          <div ref={websiteRef} className="relative ml-1.5">
            <button
              onClick={() => { setWebsiteDrop(!websiteDrop); setStrategyDrop(false) }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Globe className="w-6 h-6 text-gray-500 shrink-0" />
              <div className="text-left leading-tight min-w-0">
                {selectedWebsite ? (
                  <>
                    <div className="text-sm font-medium text-neutral-700 whitespace-nowrap truncate max-w-[160px]">{selectedWebsite.name}</div>
                    <div className="text-xs text-neutral-700/80 truncate max-w-[160px]">
                      {selectedWebsite.url.replace(/^https?:\/\//, '')}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-400">Select website</div>
                )}
              </div>
              <ChevronDown className="w-2.5 h-2.5 text-neutral-700 shrink-0" />
            </button>

            {websiteDrop && (
              <div className="absolute top-full left-0 mt-1.5 w-[440px] bg-white rounded-sm border border-gray-200 shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 mb-3">Website</p>
                  <div className="flex gap-2">
                    {/* Search */}
                    <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-sm px-3 py-2">
                      <input
                        type="text"
                        placeholder="Search by title, URL"
                        value={siteSearch}
                        onChange={(e) => setSiteSearch(e.target.value)}
                        className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                        autoFocus
                      />
                      <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                    {/* Add new website */}
                    <button
                      onClick={() => { setWebsiteDrop(false); setAddWebsiteModalOpen(true) }}
                      className="flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-semibold hover:bg-blue-50 rounded-sm transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add new website
                    </button>
                  </div>
                </div>

                {/* Website list — grouped by org */}
                <div className="max-h-72 overflow-y-auto">
                  {filteredWebsites.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">No websites found</p>
                  ) : (
                    <>
                      {orgs.map((org) => {
                        const orgSites = filteredWebsites.filter((w) => w.organisation_id === org.id)
                        if (orgSites.length === 0) return null
                        return (
                          <div key={org.id}>
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{org.name}</span>
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                                {(org.user_role as string).toLowerCase()}
                              </span>
                            </div>
                            {orgSites.map((w) => {
                              const isSelected = w.id === websiteId
                              return (
                                <button
                                  key={w.id}
                                  onClick={() => { setWebsiteId(w.id); setWebsiteDrop(false); setSiteSearch('') }}
                                  className={cn(
                                    'w-full text-left flex items-center justify-between px-4 py-2.5 transition-colors',
                                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                  )}
                                >
                                  <span className={cn('text-sm truncate', isSelected ? 'text-blue-700' : 'text-gray-700')}>
                                    {w.url}
                                  </span>
                                  <ChevronRight className={cn('w-4 h-4 shrink-0 ml-2', isSelected ? 'text-blue-400' : 'text-gray-300')} />
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                      {/* Unassigned websites (not in any org) */}
                      {filteredWebsites.filter((w) => !w.organisation_id).map((w) => {
                        const isSelected = w.id === websiteId
                        return (
                          <button
                            key={w.id}
                            onClick={() => { setWebsiteId(w.id); setWebsiteDrop(false); setSiteSearch('') }}
                            className={cn(
                              'w-full text-left flex items-center justify-between px-4 py-2.5 transition-colors',
                              isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                            )}
                          >
                            <span className={cn('text-sm truncate', isSelected ? 'text-blue-700' : 'text-gray-700')}>
                              {w.url}
                            </span>
                            <ChevronRight className={cn('w-4 h-4 shrink-0 ml-2', isSelected ? 'text-blue-400' : 'text-gray-300')} />
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-4 py-3 text-center">
                  <Link
                    to="/websites"
                    onClick={() => setWebsiteDrop(false)}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Go to all sites
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider after website selector */}
          <div className="w-px h-8 bg-slate-300 shrink-0 hidden sm:block mx-4" />

          {/* Strategy selector — hidden on small screens */}
          <div ref={strategyRef} className="relative hidden sm:block">
            <button
              onClick={() => { setStrategyDrop(!strategyDrop); setWebsiteDrop(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              {strategy === 'mobile'
                ? <Smartphone className="w-6 h-6 text-gray-800" />
                : <Monitor className="w-6 h-6 text-gray-800" />}
              <span className="text-sm font-normal text-slate-800 capitalize">{strategy}</span>
              <ChevronDown className="w-2.5 h-2.5 text-neutral-700" />
            </button>

            {strategyDrop && (
              <div className="absolute top-full left-0 mt-1.5 w-32 bg-white rounded-sm border border-gray-100 shadow-xl z-50 py-1">
                {(['mobile', 'desktop'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStrategy(s); setStrategyDrop(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors',
                      s === strategy && 'bg-blue-50'
                    )}
                  >
                    {s === 'mobile'
                      ? <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                      : <Monitor className="w-3.5 h-3.5 text-gray-400" />}
                    <span className="text-xs font-medium text-gray-700 capitalize">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider before run scan */}
          <div className="w-px h-8 bg-slate-300 shrink-0 hidden sm:block mx-4" />

          {/* Run scan button */}
          <button
            onClick={() => websiteId && !isScanRunning && setConfirmScanOpen(true)}
            disabled={!websiteId || scanMutation.isPending || isScanRunning}
            className="px-3 py-2.5 rounded-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm transition-colors"
          >
            {scanMutation.isPending ? 'Starting…' : 'Run scan'}
          </button>
          </>)}

          <div className="flex-1" />

          {/* Onboarding scan in-progress banner */}
          {activeScanJob && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#bdd0f8] bg-[#eef4ff] rounded-full mr-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                <circle cx="8" cy="8" r="7" stroke="#bfdbfe" strokeWidth="1.5" />
                <path d="M8 1a7 7 0 0 1 7 7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-medium text-[#374151]">Scanning...</span>
              <button
                onClick={() => setScanDetailOpen(true)}
                className="text-[13px] font-medium text-[#2563eb] hover:underline"
              >
                Scan details
              </button>
            </div>
          )}

          {/* Run-scan in-progress banner */}
          {scanJobs && !scanJobsDone && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-[#bdd0f8] bg-[#eef4ff] rounded-full mr-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 animate-spin">
                <circle cx="8" cy="8" r="7" stroke="#bfdbfe" strokeWidth="1.5" />
                <path d="M8 1a7 7 0 0 1 7 7" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-medium text-[#374151]">Scanning...</span>
              <button
                onClick={() => setScanModalVisible(true)}
                className="text-[13px] font-medium text-[#2563eb] hover:underline"
              >
                Scan details
              </button>
            </div>
          )}

          {/* Credits indicator — hidden on mobile */}
          {(() => {
            if (!billingCredits) return null
            const totalCredits = billingCredits.credits_total
            const leftCredits = billingCredits.credits_balance
            const reservedCredits = Math.max(totalCredits - leftCredits, 0)
            const rawPct = totalCredits > 0 ? (leftCredits / totalCredits) * 100 : 0
            const pct = Math.floor(rawPct)
            // Leave a visible sliver of the unfilled track whenever any credits have been used,
            // even if the used amount is small enough that the rounded percentage still reads ~100%.
            const barPct = reservedCredits > 0 ? Math.min(rawPct, 97) : 100
            const trialDaysLeft = billingCredits.current_period_end
              ? Math.max(Math.ceil((new Date(billingCredits.current_period_end).getTime() - Date.now()) / 86400000), 0)
              : null
            return (
              <>
                {billingCredits.is_trial && trialDaysLeft !== null && (
                  <div className="hidden sm:flex items-center px-4 py-2.5 rounded-lg bg-amber-100 text-[13px] text-gray-900 mr-4 self-end mb-[9px] whitespace-nowrap">
                    Trial: Expires in&nbsp;<span className="font-bold">{trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}</span>
                  </div>
                )}
                <div ref={creditsRef} className="relative hidden sm:block mr-6 self-end pb-2">
                <button
                  onClick={() => setCreditsOpen(!creditsOpen)}
                  className="flex flex-col items-end gap-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2e3240] rounded-full" style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[15px] font-semibold text-gray-900 whitespace-nowrap">{leftCredits}/{totalCredits} ({pct}%) credits left</span>
                    <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="shrink-0 text-blue-600">
                      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                </button>

                {creditsOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[380px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <span className="text-[15px] font-bold text-[#2e3240]">Credit usage</span>
                      <button onClick={() => setCreditsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-5 py-5">
                      <p className="text-[12px] text-gray-400 mb-2">Your balance</p>
                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="text-[36px] font-bold text-[#2e3240] leading-none">{leftCredits}</span>
                        <span className="text-[15px] text-gray-500">/ {totalCredits} credits left</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-[#2e3240] rounded-full" style={{ width: `${barPct}%` }} />
                      </div>
                      <div className="flex items-center gap-4 text-[13px] text-gray-600 mb-5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#2e3240] shrink-0" />
                          Balance ({leftCredits})
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                          Reserved ({reservedCredits})
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-400 mb-4">Active scans</p>
                      <div className="flex flex-col items-center py-6 gap-2">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-gray-300">
                          <rect x="4" y="4" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                          <rect x="23" y="4" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                          <rect x="4" y="23" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                          <rect x="23" y="23" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                        </svg>
                        <p className="text-[13px] text-gray-400">You don't have any active scans.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>
            )
          })()}

          {/* History — hidden on mobile */}
          <Link to="/scan-history" className="hidden sm:flex w-9 h-9 items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-50 transition-colors">
            <History className="w-6 h-6" />
          </Link>

          {/* Upgrade — hidden on mobile */}
          <Link
            to="/upgrade"
            className="hidden sm:flex items-center gap-1 px-4 py-3.5 rounded-sm text-sm font-semibold text-orange-950 bg-amber-500 hover:bg-amber-400 transition-colors mx-2"
          >
            <img src={UpgradeSvg} alt="" className="w-4 h-4" />
            Upgrade
          </Link>

          {/* Help — hidden on mobile */}
          {/* <button className="hidden sm:flex w-8 h-8 items-center justify-center text-blue-600 hover:text-blue-700 rounded-full hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button> */}

          {/* Plan pill + avatar (desktop) */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserMenu(!userMenu)}
              title={billingCredits?.status === 'cancelled' ? 'Plan cancelled — access continues until the current period ends' : undefined}
              className="hidden sm:flex items-center gap-2 pl-4 pr-1 py-1 rounded-full border border-[#9ca3af] hover:border-[#6b7280] transition-colors bg-white"
            >
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2e3240] uppercase tracking-wide">
                {billingCredits?.status === 'cancelled' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                )}
                {!billingCredits?.plan_name || billingCredits.plan_name === 'free' ? 'BASIC' : billingCredits.plan_name.toUpperCase()}
              </span>
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
            </button>
            {/* Mobile: plain avatar only */}
            <button
              onClick={() => setUserMenu(!userMenu)}
              className="sm:hidden w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center shrink-0 hover:bg-neutral-800 transition-colors"
            >
              <span className="text-white text-xs font-bold">{initials}</span>
            </button>

            {userMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-[#f3f4f6] rounded-xl shadow-xl z-50 overflow-hidden p-4 flex flex-col gap-4">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{user?.username}</div>
                    <div className="text-sm text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>

                {/* Upgrade button */}
                <Link
                  to="/upgrade"
                  onClick={() => setUserMenu(false)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 rounded-lg text-sm font-semibold text-orange-950 transition-colors"
                >
                  <img src={UpgradeSvg} alt="" className="w-4 h-4" />
                  Upgrade
                </Link>

                {/* Organisation settings */}
                <Link
                  to="/settings/organisation"
                  onClick={() => setUserMenu(false)}
                  className="w-full flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  Organisation settings
                </Link>

                {/* Log out */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 text-xs text-red-500 hover:text-red-600 transition-colors pt-1 border-t border-gray-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </button>
              </div>
            )}
          </div>
      </header>

      {/* ── Body: sidebar + content ───────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Icon sidebar — hidden on mobile, hidden on /upgrade */}
        {location !== '/upgrade' && <aside className="hidden md:flex w-[62px] shrink-0 bg-white border-r border-[#d8dde9] flex-col items-center py-3 z-30 overflow-y-auto">
          <nav className="flex flex-col items-center w-full flex-1">
            {[...sideLinks, ...categoryLinks].map(({ to, icon: Icon, label }) => {
              const isActive = to ? location.startsWith(to) : false
              const inner = (
                <div className={cn(
                  'w-[50px] h-[50px] rounded-[8px] flex items-center justify-center transition-colors',
                  isActive ? 'bg-[#e5eeff] text-[#2e3240]' : 'text-gray-500 group-hover:text-gray-700'
                )}>
                  <Icon className="w-[18px] h-[18px]" />
                </div>
              )
              return to ? (
                <Link key={label} to={to} title={label}
                  className="flex items-center justify-center py-[5px] w-full group">
                  {inner}
                </Link>
              ) : (
                <button key={label} disabled title={label}
                  className="flex items-center justify-center py-[5px] w-full group opacity-35 cursor-not-allowed">
                  {inner}
                </button>
              )
            })}
          </nav>

          <Link
            to="/settings"
            className="flex flex-col items-center gap-1 py-[5px] w-full group">
            <div className={cn(
              'w-[50px] h-[50px] rounded-[8px] flex items-center justify-center transition-colors',
              location.startsWith('/settings') ? 'bg-[#e5eeff] text-[#2e3240]' : 'text-gray-500 group-hover:text-gray-700'
            )}>
              <Settings className="w-[18px] h-[18px]" />
            </div>
            <span className="text-[11px] font-medium text-[#404041] leading-none">Settings</span>
          </Link>
        </aside>}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around py-1.5 z-40">
        <Link
          to="/dashboard"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm transition-colors',
            location.startsWith('/dashboard') ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        <Link
          to="/websites"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm transition-colors',
            location.startsWith('/websites') ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <Globe className="w-5 h-5" />
          <span className="text-xs font-medium">Websites</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Log out</span>
        </button>
      </nav>
    </div>

    {addWebsiteModalOpen && (
      <AddNewWebsiteModal
        orgs={orgs}
        onClose={() => setAddWebsiteModalOpen(false)}
      />
    )}

    {viewerErrorOpen && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-[16px] shadow-xl w-[380px] px-8 py-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-[18px] font-bold text-[#2e3240] mb-2">Permission denied</h3>
          <p className="text-[14px] text-[#73767f] mb-6">Viewers cannot scan this site. Ask an admin to run the scan.</p>
          <button
            onClick={() => setViewerErrorOpen(false)}
            className="px-8 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-semibold rounded-[10px] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    )}
    </BgScanContext.Provider>
    </ScanModalContext.Provider>
  )
}
