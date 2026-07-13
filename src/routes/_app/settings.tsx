import { createFileRoute, Outlet, Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsLayout,
})

const ACTIVE_LINKS = [
  { label: 'General settings', to: '/settings' as const, exact: true },
  { label: 'Organisations & websites', to: '/settings/organisation' as const, exact: false },
  { label: 'Team', to: '/settings/team' as const, exact: false },
] as const

function SettingsLayout() {
  const location = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex min-h-full">
      <aside className="w-[240px] shrink-0 border-r border-[#d8dde9] bg-white flex flex-col py-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-6 py-2 text-[13px] text-[#73767f] hover:text-[#2e3240] transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <p className="px-6 mt-2 mb-4 text-[21px] font-bold text-[#2e3240]">Settings</p>

        <nav className="flex flex-col gap-0">
          {ACTIVE_LINKS.map(({ label, to, exact }) => {
            const isActive = exact ? location === to : location.startsWith(to)
            return (
              <Link
                key={label}
                to={to}
                className={cn(
                  'px-6 py-2.5 text-[14px] font-medium transition-colors border-l-2',
                  isActive
                    ? 'text-[#0b66e4] bg-[#eef4ff] border-[#0b66e4]'
                    : 'text-[#2e3240] hover:bg-[#f5f7fa] border-transparent'
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
