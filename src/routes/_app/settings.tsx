import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Info, Wifi } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

const TABS = ['General setting', 'Accessibility', 'Uptime settings'] as const
type Tab = typeof TABS[number]

const LOCATIONS = [
  { code: 'DE', flag: '🇩🇪', label: 'Germany' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
  { code: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'SG', flag: '🇸🇬', label: 'Singapore' },
]

const NETWORKS = [
  'Faster (similar 4G)',
  'Fast (similar 3G)',
  'Slow (similar 2G)',
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-blue-600' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function GeneralSetting() {
  const [creditEnabled, setCreditEnabled] = useState(true)
  const [creditLimit, setCreditLimit] = useState('100')
  const [location, setLocation] = useState('Germany')
  const [network, setNetwork] = useState('Faster (similar 4G)')
  const [locationOpen, setLocationOpen] = useState(false)
  const [networkOpen, setNetworkOpen] = useState(false)

  const selectedLocation = LOCATIONS.find((l) => l.label === location) ?? LOCATIONS[0]

  return (
    <div className="space-y-5">
      {/* Scan credit usage limit */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-900">Scan credit usage limit</span>
          <Toggle checked={creditEnabled} onChange={setCreditEnabled} />
        </div>

        {creditEnabled && (
          <>
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl px-4 py-3 mb-5 text-xs text-gray-600">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>Please set the max credits you can use in a single scan session. You can change this limit whenever you like.</span>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Credit Limit</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="100"
                className="w-52 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Save changes
            </button>
          </>
        )}
      </div>

      {/* Select location and network */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Select location and network</h3>

        {/* Scan location */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Scan location<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative w-52">
            <button
              type="button"
              onClick={() => { setLocationOpen(!locationOpen); setNetworkOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedLocation.flag}</span>
                <span>{selectedLocation.label}</span>
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {locationOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocation(l.label); setLocationOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-50',
                      location === l.label && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Select mobile network */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Select mobile network<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative w-52">
            <button
              type="button"
              onClick={() => { setNetworkOpen(!networkOpen); setLocationOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-gray-400" />
                <span>{network}</span>
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {networkOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                {NETWORKS.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setNetwork(n); setNetworkOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-gray-50',
                      network === n && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <Wifi className="w-4 h-4 text-gray-400" />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          Save changes
        </button>
      </div>
    </div>
  )
}

function AccessibilitySetting() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-400 text-center py-8">Accessibility settings coming soon.</p>
    </div>
  )
}

function UptimeSetting() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <p className="text-sm text-gray-400 text-center py-8">Uptime settings coming soon.</p>
    </div>
  )
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('General setting')

  return (
    <div className="flex flex-col min-h-full">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6">
        <div className="flex overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        {activeTab === 'General setting' && <GeneralSetting />}
        {activeTab === 'Accessibility' && <AccessibilitySetting />}
        {activeTab === 'Uptime settings' && <UptimeSetting />}
      </div>
    </div>
  )
}
