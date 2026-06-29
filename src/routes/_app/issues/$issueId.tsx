import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertTriangle, Info, Loader2, Tag, Gauge } from 'lucide-react'
import { getIssue } from '../../../api/issues'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'

export const Route = createFileRoute('/_app/issues/$issueId')({
  component: IssueDetailPage,
})

function IssueDetailPage() {
  const { issueId } = Route.useParams()

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => getIssue(issueId),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!issue) return <div className="p-8 text-sm text-gray-500">Issue not found.</div>

  const priorityColors = {
    high: 'bg-red-50 text-red-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-green-50 text-green-700',
  }

  return (
    <div className="p-8 max-w-4xl">
      <Link
        to="/scans/$scanId/issues"
        params={{ scanId: issue.scan_job_id }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Issues
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="mt-1 shrink-0">
          {issue.severity === 'critical' ? (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          ) : (
            <Info className="w-6 h-6 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{issue.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              issue.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {issue.severity === 'critical' ? 'Critical' : 'Non-Critical'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[issue.priority]}`}>
              {issue.priority} priority
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 capitalize">
              {issue.category.replace('_', ' ')}
            </span>
            {issue.wcag_criterion && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700">
                WCAG {issue.wcag_version} · {issue.wcag_criterion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Score', value: `${issue.score}`, icon: Gauge, color: 'text-blue-600' },
          { label: 'Items', value: issue.item_count ?? '—', icon: Tag, color: 'text-gray-700' },
          {
            label: 'Wasted Time',
            value: issue.wasted_ms ? `${(issue.wasted_ms / 1000).toFixed(1)}s` : '—',
            icon: AlertTriangle,
            color: 'text-amber-600',
          },
          {
            label: 'Wasted Bytes',
            value: issue.wasted_bytes ? `${(issue.wasted_bytes / 1024).toFixed(0)} KB` : '—',
            icon: Info,
            color: 'text-gray-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">{issue.description}</p>
            {issue.display_value && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 font-medium">
                {issue.display_value}
              </div>
            )}
            {issue.rule_id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">Rule ID</div>
                <code className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded mt-1 inline-block">
                  {issue.rule_id}
                </code>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
            {issue.details ? (
              <pre className="text-xs text-gray-700 overflow-auto bg-gray-50 rounded-lg p-4 max-h-96">
                {JSON.stringify(issue.details, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-400">No additional details available.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
