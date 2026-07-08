import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/upgrade')({
  component: UpgradePage,
})

function UpgradePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-sm bg-blue-50 flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Plans & pricing coming soon</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Upgrade options will be available here once plan information is connected from the backend.
      </p>
      <Link
        to="/dashboard"
        className="text-sm font-semibold text-blue-600 hover:underline"
      >
        ← Back to dashboard
      </Link>
    </div>
  )
}
