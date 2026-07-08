import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { Globe, Loader2, Download, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { triggerGuestScan, pollGuestScan, guestScanPdfUrl } from '../api/scans'
import type { GuestScanData, GuestScanPendingResponse, ScanStrategy } from '../types'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/guest')({
  component: GuestScanPage,
})

const SCORE_CATEGORIES = [
  { key: 'performance', label: 'Performance', color: '#3b82f6' },
  { key: 'accessibility', label: 'Accessibility', color: '#8b5cf6' },
  { key: 'best-practices', label: 'Best Practices', color: '#10b981' },
  { key: 'seo', label: 'SEO', color: '#f59e0b' },
]

const METRICS_META: Record<string, { label: string; unit: string }> = {
  'first-contentful-paint': { label: 'First Contentful Paint', unit: 's' },
  'largest-contentful-paint': { label: 'Largest Contentful Paint', unit: 's' },
  'total-blocking-time': { label: 'Total Blocking Time', unit: 'ms' },
  'cumulative-layout-shift': { label: 'Cumulative Layout Shift', unit: '' },
  'speed-index': { label: 'Speed Index', unit: 's' },
  'interactive': { label: 'Time to Interactive', unit: 's' },
}

function scoreColor(s: number | null) {
  if (s == null) return '#9ca3af'
  if (s >= 90) return '#22c55e'
  if (s >= 50) return '#f59e0b'
  return '#ef4444'
}

function formatMetric(key: string, value: number | null) {
  if (value == null) return '—'
  const meta = METRICS_META[key]
  if (!meta) return String(value)
  if (key === 'cumulative-layout-shift') return value.toFixed(3)
  if (meta.unit === 's') return `${(value / 1000).toFixed(1)} s`
  return `${Math.round(value)} ms`
}

function ScoreRing({ score, label }: { score: number | null; label: string }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const fill = score != null ? (score / 100) * circ : 0
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={scoreColor(score)} strokeWidth="10"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color: scoreColor(score) }}>
            {score != null ? score : '—'}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-gray-600 text-center">{label}</span>
    </div>
  )
}

function GuestScanPage() {
  const [url, setUrl] = useState('')
  const [strategy, setStrategy] = useState<ScanStrategy>('mobile')
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle')
  const [guestId, setGuestId] = useState<string | null>(null)
  const [result, setResult] = useState<GuestScanData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setPhase('scanning')
    setResult(null)
    setGuestId(null)
    setErrorMsg('')

    try {
      const res = await triggerGuestScan(url.trim(), strategy)

      // Sync result (rare — scanner returned immediately)
      if ('scores' in res) {
        setResult(res as GuestScanData)
        setPhase('done')
        return
      }

      const { guest_scan_id } = res as GuestScanPendingResponse
      setGuestId(guest_scan_id)

      // Poll every 4 seconds
      pollRef.current = setInterval(async () => {
        try {
          const status = await pollGuestScan(guest_scan_id)
          if (status.status === 'complete' && status.data) {
            if (pollRef.current) clearInterval(pollRef.current)
            setResult(status.data)
            setPhase('done')
          } else if (status.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current)
            setErrorMsg(status.message ?? 'Scan failed')
            setPhase('error')
          }
        } catch {
          // network hiccup — keep polling
        }
      }, 4000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Could not start scan')
      setPhase('idle')
    }
  }

  function handleReset() {
    if (pollRef.current) clearInterval(pollRef.current)
    setPhase('idle')
    setResult(null)
    setGuestId(null)
    setErrorMsg('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur border-b border-gray-100 flex items-center px-6 gap-4">
        <span className="font-bold text-xl text-gray-900">
          <span className="text-blue-600">W</span>ebYes
        </span>
        <div className="flex-1" />
        <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Login</Link>
        <Link to="/signup"
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-sm hover:bg-blue-700 transition-colors">
          Sign up free
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" /> Free instant scan — no sign-up required
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Audit your website for free
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Get a full Lighthouse audit — performance, accessibility, best practices, and SEO — in seconds.
          </p>
        </div>

        {/* Scan form */}
        {phase === 'idle' && (
          <form onSubmit={handleScan} className="w-full max-w-xl bg-white rounded-sm border border-gray-200 shadow-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website URL</label>
              <div className="flex items-center border border-gray-200 rounded-sm px-3 py-2.5 gap-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="flex-1 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Device</label>
              <div className="grid grid-cols-2 gap-2">
                {(['mobile', 'desktop'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setStrategy(s)}
                    className={cn(
                      'py-2.5 rounded-sm text-sm font-medium border-2 transition-colors capitalize',
                      strategy === s
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-sm transition-colors">
              Run free audit
            </button>

            <p className="text-center text-xs text-gray-400">
              Results expire after 30 minutes.{' '}
              <Link to="/signup" className="text-blue-600 hover:underline">Sign up</Link>{' '}
              for permanent history &amp; multi-page scanning.
            </p>
          </form>
        )}

        {/* Scanning state */}
        {phase === 'scanning' && (
          <div className="w-full max-w-xl bg-white rounded-sm border border-gray-200 shadow-xl p-10 flex flex-col items-center gap-5">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 mb-1">Scanning your website…</div>
              <div className="text-sm text-gray-500">Running Lighthouse audit. This usually takes 15–45 seconds.</div>
            </div>
            <div className="flex gap-1.5">
              {['Performance', 'Accessibility', 'Best Practices', 'SEO'].map((c) => (
                <span key={c} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-sm font-medium animate-pulse">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="w-full max-w-xl bg-white rounded-sm border border-red-100 shadow-xl p-8 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <div>
              <div className="text-base font-bold text-gray-900 mb-1">Scan failed</div>
              <div className="text-sm text-gray-500">{errorMsg || 'The scanner could not audit this URL.'}</div>
            </div>
            <button onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-sm hover:bg-blue-700 transition-colors">
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {phase === 'done' && result && (
          <div className="w-full max-w-2xl space-y-5">
            {/* Header card */}
            <div className="bg-white rounded-sm border border-gray-200 shadow-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold text-green-700">Scan complete</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-xs">
                    {result.url} &nbsp;·&nbsp; {result.strategy}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {guestId && (
                    <a
                      href={guestScanPdfUrl(guestId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-sm text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF report
                    </a>
                  )}
                  <button onClick={handleReset}
                    className="px-3 py-1.5 border border-gray-200 rounded-sm text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Scan again
                  </button>
                </div>
              </div>

              {/* Score rings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {SCORE_CATEGORIES.map(({ key, label }) => (
                  <ScoreRing key={key} score={result.scores[key]?.score ?? null} label={label} />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Audit summary</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total audits', value: result.summary.total, color: 'text-gray-900' },
                  { label: 'Passed', value: result.summary.passed, color: 'text-green-600' },
                  { label: 'Issues', value: result.summary.critical + result.summary.non_critical, color: 'text-amber-600' },
                  { label: 'Critical', value: result.summary.critical, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="border border-gray-100 rounded-sm p-3 text-center">
                    <div className={cn('text-2xl font-bold', color)}>{value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Core Web Vitals</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(METRICS_META).map(([key, meta]) => {
                  const m = result.metrics[key]
                  return (
                    <div key={key} className="border border-gray-100 rounded-sm p-3">
                      <div className="text-xs text-gray-500 mb-1">{meta.label}</div>
                      <div className="text-base font-bold text-gray-900">
                        {m ? formatMetric(key, m.value) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-sm p-6 text-center text-white">
              <h3 className="text-base font-bold mb-1">Want the full picture?</h3>
              <p className="text-sm text-blue-100 mb-4">
                Sign up free to scan multiple pages, track history, and get detailed issue breakdowns.
              </p>
              <Link to="/signup"
                className="inline-flex items-center px-6 py-2.5 bg-white text-blue-700 text-sm font-bold rounded-sm hover:bg-blue-50 transition-colors">
                Create free account →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
