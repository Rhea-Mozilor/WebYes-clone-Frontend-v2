import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, AlertTriangle, Info, Loader2, ChevronRight } from 'lucide-react'
import { listIssues } from '../../../../api/issues'
import { getPageScores } from '../../../../api/scans'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/tabs'
import type { IssueCategory, IssueSeverity } from '../../../../types'

export const Route = createFileRoute('/_app/scans/$scanId/issues')({
  component: IssuesPage,
})

const CATEGORIES: { value: IssueCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'performance', label: 'Performance' },
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'best_practices', label: 'Best Practices' },
  { value: 'seo', label: 'SEO' },
]

function IssuesPage() {
  const { scanId } = Route.useParams()
  const [category, setCategory] = useState<IssueCategory | 'all'>('all')
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all')

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['issues', scanId, category, severity],
    queryFn: () =>
      listIssues({
        scan_job_id: scanId,
        ...(category !== 'all' && { category }),
        ...(severity !== 'all' && { severity }),
      }),
  })

  const { data: pages = [] } = useQuery({
    queryKey: ['page-scores', scanId],
    queryFn: () => getPageScores(scanId),
  })

  const critical = issues.filter((i) => i.severity === 'critical')
  const nonCritical = issues.filter((i) => i.severity === 'non_critical')

  return (
    <div className="p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Issues</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {critical.length} critical · {nonCritical.length} non-critical
          </p>
        </div>
      </div>

      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="pages">Pages ({pages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="issues">
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value as IssueCategory | 'all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === c.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                }`}
              >
                {c.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              {(['all', 'critical', 'non_critical'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    severity === s
                      ? s === 'critical'
                        ? 'bg-red-600 text-white'
                        : s === 'non_critical'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-700 text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {s === 'all' ? 'All Severity' : s === 'critical' ? 'Critical' : 'Non-Critical'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
            </div>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <Info className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-500">No issues found for the selected filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <Link
                  key={issue.id}
                  to="/issues/$issueId"
                  params={{ issueId: issue.id }}
                  className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:border-blue-100 hover:shadow-md transition-all group"
                >
                  <div className="shrink-0">
                    {issue.severity === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Info className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {issue.title}
                      </span>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        issue.severity === 'critical'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {issue.severity === 'critical' ? 'Critical' : 'Non-Critical'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{issue.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 capitalize">{issue.category.replace('_', ' ')}</span>
                      {issue.display_value && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className="text-xs text-gray-400">{issue.display_value}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pages">
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.page_url} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="font-medium text-sm text-gray-900 mb-3 truncate">{page.page_url}</div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Perf', value: page.performance_score },
                    { label: 'A11y', value: page.accessibility_score },
                    { label: 'BP', value: page.best_practices_score },
                    { label: 'SEO', value: page.seo_score },
                  ].map((s) => {
                    const v = s.value ?? 0
                    const color = v >= 90 ? 'text-green-600' : v >= 50 ? 'text-amber-600' : 'text-red-600'
                    const bg = v >= 90 ? 'bg-green-50' : v >= 50 ? 'bg-amber-50' : 'bg-red-50'
                    return (
                      <div key={s.label} className={`${bg} rounded-lg p-2 text-center`}>
                        <div className={`text-lg font-bold ${color}`}>{s.value ?? '—'}</div>
                        <div className="text-xs text-gray-500">{s.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
