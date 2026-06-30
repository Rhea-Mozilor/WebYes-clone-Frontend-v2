import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutGrid,
  Accessibility,
  Gauge,
  BadgeCheck,
  TrendingUp,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight,
  Play,
  Zap,
  HelpCircle,
  Monitor,
  Smartphone,
  LogOut,
  Search,
  Plus,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../lib/utils'
import { getMe, logout } from '../api/auth'
import { listWebsites, createWebsite } from '../api/websites'
import { triggerScan } from '../api/scans'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { useSiteStore } from '../store/siteStore'

export const Route = createFileRoute('/_app')({
  beforeLoad: () => {
    if (!localStorage.getItem('access_token')) throw redirect({ to: '/login' })
  },
  component: AppLayout,
})

function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clearAuth } = useAuthStore()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: websites = [] } = useQuery({ queryKey: ['websites'], queryFn: listWebsites })
  const { websiteId, setWebsiteId, strategy, setStrategy } = useSiteStore()
  const location = useRouterState({ select: (s) => s.location.pathname })

  const [websiteDrop, setWebsiteDrop] = useState(false)
  const [strategyDrop, setStrategyDrop] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const websiteRef = useRef<HTMLDivElement>(null)
  const strategyRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Website dropdown state
  const [siteSearch, setSiteSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  async function handleAddWebsite() {
    if (!newName.trim() || !newUrl.trim()) return
    setAddLoading(true)
    try {
      const site = await createWebsite(newName.trim(), newUrl.trim())
      await queryClient.invalidateQueries({ queryKey: ['websites'] })
      setWebsiteId(site.id)
      setNewName(''); setNewUrl(''); setShowAddForm(false); setWebsiteDrop(false)
      toast.success('Website added!')
    } catch {
      toast.error('Could not add website')
    } finally {
      setAddLoading(false)
    }
  }

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
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedWebsite = websites.find((w) => w.id === websiteId)

  const scanMutation = useMutation({
    mutationFn: () => triggerScan(websiteId!),
    onSuccess: (job) => {
      toast.success('Scan started!')
      const scanId = strategy === 'mobile' ? job.mobile_scan_job_id : job.desktop_scan_job_id
      navigate({ to: '/scans/$scanId', params: { scanId: String(scanId) } })
    },
    onError: () => toast.error('Could not start scan'),
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

  const categoryLinks = [
    { to: '/accessibility', icon: Accessibility, label: 'Accessibility' },
    { to: '/performance', icon: Gauge, label: 'Performance' },
    { to: '/quality', icon: BadgeCheck, label: 'Quality' },
    { to: '/seo', icon: TrendingUp, label: 'SEO' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* ── Full-width header ─────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center gap-2 sm:gap-2.5 px-3 sm:px-5 z-20 shrink-0 w-full">
          <span className="font-bold text-xl text-gray-900 mr-1 hidden sm:block">
            <span className="text-blue-600">W</span>ebYes
          </span>

          {/* Website selector */}
          <div ref={websiteRef} className="relative">
            <button
              onClick={() => { setWebsiteDrop(!websiteDrop); setStrategyDrop(false) }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="text-left leading-tight min-w-0">
                {selectedWebsite ? (
                  <>
                    <div className="text-xs font-semibold text-gray-800 whitespace-nowrap max-w-[80px] sm:max-w-none truncate">{selectedWebsite.name}</div>
                    <div className="hidden sm:block text-xs text-gray-400 truncate max-w-[110px]">
                      {selectedWebsite.url.replace(/^https?:\/\//, '')}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400">Select</div>
                )}
              </div>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {websiteDrop && (
              <div className="absolute top-full left-0 mt-1.5 w-96 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900 mb-3">Website</p>
                  <div className="flex gap-2">
                    {/* Search */}
                    <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
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
                      onClick={() => setShowAddForm((v) => !v)}
                      className="flex items-center gap-1.5 px-3 py-2 border-2 border-blue-600 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Add new website
                    </button>
                  </div>

                  {/* Inline add form */}
                  {showAddForm && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-blue-800">New website</p>
                        <button onClick={() => setShowAddForm(false)}><X className="w-3.5 h-3.5 text-blue-400" /></button>
                      </div>
                      <input
                        type="text"
                        placeholder="Name (e.g. My Store)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none bg-white placeholder-gray-400 focus:border-blue-400"
                      />
                      <input
                        type="url"
                        placeholder="URL (e.g. https://example.com)"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWebsite()}
                        className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 outline-none bg-white placeholder-gray-400 focus:border-blue-400"
                      />
                      <button
                        onClick={handleAddWebsite}
                        disabled={addLoading || !newName.trim() || !newUrl.trim()}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {addLoading ? 'Adding…' : 'Add website'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Website list */}
                <div className="max-h-72 overflow-y-auto">
                  {filteredWebsites.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-400 text-center">No websites found</p>
                  ) : (
                    <>
                      <p className="px-4 pt-3 pb-1 text-xs text-gray-400">Recently viewed</p>
                      {filteredWebsites.map((w) => {
                        const isSelected = w.id === websiteId
                        const displayUrl = w.url.replace(/^https?:\/\//, '')
                        return (
                          <div key={w.id}>
                            {/* Website group header */}
                            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{w.name}</span>
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Admin</span>
                            </div>
                            {/* URL row */}
                            <button
                              onClick={() => { setWebsiteId(w.id); setWebsiteDrop(false); setSiteSearch('') }}
                              className={cn(
                                'w-full text-left flex items-center justify-between px-4 py-2.5 transition-colors',
                                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                              )}
                            >
                              <span className={cn('text-sm truncate', isSelected ? 'text-blue-700' : 'text-gray-700')}>
                                {displayUrl}
                              </span>
                              <ChevronRight className={cn('w-4 h-4 shrink-0 ml-2', isSelected ? 'text-blue-400' : 'text-gray-300')} />
                            </button>
                          </div>
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
                    Go to all websites
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Strategy selector — hidden on small screens */}
          <div ref={strategyRef} className="relative hidden sm:block">
            <button
              onClick={() => { setStrategyDrop(!strategyDrop); setWebsiteDrop(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {strategy === 'mobile'
                ? <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                : <Monitor className="w-3.5 h-3.5 text-gray-500" />}
              <span className="text-xs font-medium text-gray-700 capitalize">{strategy}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {strategyDrop && (
              <div className="absolute top-full left-0 mt-1.5 w-32 bg-white rounded-xl border border-gray-100 shadow-xl z-50 py-1">
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

          {/* Run scan */}
          <button
            onClick={() => websiteId && scanMutation.mutate()}
            disabled={!websiteId || scanMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Play className="w-3 h-3 fill-white" />
            {scanMutation.isPending ? 'Starting…' : 'Run scan'}
          </button>

          <div className="flex-1" />

          {/* Plan info */}
          <div className="hidden lg:flex flex-col items-end gap-0.5 mr-1">
            <span className="text-xs text-gray-500">
              Current plan: <span className="font-semibold text-gray-800">Enterprise yearly</span>
            </span>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-[1%] bg-blue-500 rounded-full" />
              </div>
              <span className="text-xs text-gray-400">0/2000 (1%) credit used</span>
            </div>
          </div>

          {/* Upgrade — hidden on mobile */}
          <Link
            to="/upgrade"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}
          >
            <Zap className="w-3 h-3 fill-white" />
            Upgrade
          </Link>

          {/* Help — hidden on mobile */}
          <button className="hidden sm:flex w-8 h-8 items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* User avatar + menu */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => setUserMenu(!userMenu)}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors"
            >
              <span className="text-white text-xs font-bold">{initials}</span>
            </button>

            {userMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-gray-50">
                  <div className="text-xs font-semibold text-gray-800 truncate">{user?.username}</div>
                  <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
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
        {/* Icon sidebar — hidden on mobile */}
        <aside className="hidden md:flex w-16 shrink-0 bg-white border-r border-gray-100 flex-col items-center pt-4 pb-5 z-30 overflow-y-auto">
          <nav className="flex flex-col items-center gap-1 flex-1">
            {sideLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                title={label}
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                  location.startsWith(to)
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                )}
              >
                <Icon className="w-5 h-5" />
              </Link>
            ))}

            <div className="w-6 h-px bg-gray-100 my-3" />

            {categoryLinks.map(({ to, icon: Icon, label }) =>
              to ? (
                <Link
                  key={label}
                  to={to}
                  title={label}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                    location.startsWith(to)
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              ) : (
                <button
                  key={label}
                  title={label}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            )}
          </nav>

          <Link
            to="/settings"
            title="Settings"
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              location.startsWith('/settings')
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            )}
          >
            <Settings className="w-5 h-5" />
          </Link>
        </aside>

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
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors',
            location.startsWith('/dashboard') ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        <Link
          to="/websites"
          className={cn(
            'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors',
            location.startsWith('/websites') ? 'text-blue-600' : 'text-gray-400'
          )}
        >
          <Globe className="w-5 h-5" />
          <span className="text-xs font-medium">Websites</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Log out</span>
        </button>
      </nav>
    </div>
  )
}
