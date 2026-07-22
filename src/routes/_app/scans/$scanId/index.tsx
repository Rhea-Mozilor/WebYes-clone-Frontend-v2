import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Zap, Eye, Shield, Search } from 'lucide-react'
import { getScanJob, getScanDashboard } from '../../../../api/scans'

export const Route = createFileRoute('/_app/scans/$scanId/')({
  component: ScanResultsPage,
})

function scoreColor(score: number) {
  if (score >= 90) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function ScoreRing({ score, label, icon: Icon }: { score: number; label: string; icon: typeof Zap }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = scoreColor(score)
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="#e5e7eb" strokeWidth={7} />
        <circle
          cx={48}
          cy={48}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
        <text x={48} y={44} dominantBaseline="middle" textAnchor="middle" fontSize={18} fontWeight={700} fill={color}>
          {score}
        </text>
      </svg>
      <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
    </div>
  )
}

function ScanResultsPage() {
  const { scanId } = Route.useParams()

  const { data: job } = useQuery({
    queryKey: ['scan-job', scanId],
    queryFn: () => getScanJob(scanId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'running' || status === 'pending' ? 3000 : false
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['scan-dashboard', scanId],
    queryFn: () => getScanDashboard(scanId),
    enabled: job?.status === 'completed',
  })

  const isRunning = job?.status === 'running' || job?.status === 'pending'

  const scores = summary?.scores ?? { performance: 0, accessibility: 0, quality: 0, seo: 0 }
  const radarData = [
    { subject: 'Performance', value: scores.performance ?? 0 },
    { subject: 'Accessibility', value: scores.accessibility ?? 0 },
    { subject: 'Quality', value: scores.quality ?? 0 },
    { subject: 'SEO', value: scores.seo ?? 0 },
  ]

  return (
    <div className="p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {isRunning && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-sm px-5 py-4 mb-6">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          <div>
            <div className="text-sm font-semibold text-blue-800">Scan in progress…</div>
            <div className="text-xs text-blue-600">Results will appear here when the scan completes.</div>
          </div>
        </div>
      )}

      {job?.status === 'failed' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-sm px-5 py-4 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="text-sm text-red-800 font-medium">Scan failed. Please try again.</div>
        </div>
      )}

      {job?.status === 'completed' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-sm px-5 py-4 mb-6">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="text-sm font-semibold text-green-800">Scanning Completed.</div>
          <span className="text-xs text-green-600">Results are ready below.</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Results</h1>
          <div className="text-sm text-gray-500 mt-0.5 capitalize">
            {job?.strategy} · {job && new Date(job.created_at).toLocaleString()}
          </div>
        </div>
        {job?.status === 'completed' && (
          <Link
            to="/scans/$scanId/issues"
            params={{ scanId }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-sm transition-colors"
          >
            View All Issues
          </Link>
        )}
      </div>

      {/* Live progress while running */}
      {isRunning && (
        <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Progress</h2>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{job?.pages_scanned ?? 0}</div>
              <div className="text-xs text-gray-500">Done</div>
            </div>
          </div>
          {job?.current_url && (
            <p className="mt-3 text-xs text-gray-500 truncate">Scanning: {job.current_url}</p>
          )}
        </div>
      )}

      {summary && (
        <>
          {/* Score rings */}
          <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Category Scores</h2>
            <div className="flex justify-around flex-wrap gap-6">
              <ScoreRing score={scores.performance ?? 0} label="Performance" icon={Zap} />
              <ScoreRing score={scores.accessibility ?? 0} label="Accessibility" icon={Eye} />
              <ScoreRing score={scores.quality ?? 0} label="Quality" icon={Shield} />
              <ScoreRing score={scores.seo ?? 0} label="SEO" icon={Search} />
            </div>
          </div>

          {/* Radar + issues summary */}
          <div className="grid grid-cols-3 gap-5 mb-5">
            <div className="col-span-2 bg-white rounded-sm border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Score Overview</h2>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f3f4f6" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Issues Summary</h2>
              <div className="space-y-3">
                {[
                  { label: 'Pages scanned', value: summary.scanned_pages.length, color: 'text-gray-900' },
                  { label: 'Total issues', value: summary.issues_summary.total, color: 'text-gray-900' },
                  { label: 'Critical issues', value: summary.issues_summary.critical, color: 'text-red-600' },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{s.label}</span>
                    <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Issues by category */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="text-xs text-gray-400 mb-2">Issues by category</div>
                {Object.entries(summary.issues_by_category).map(([key, count]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</span>
                    <span className="text-xs font-semibold text-gray-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
