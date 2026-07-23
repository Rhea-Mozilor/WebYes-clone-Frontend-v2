import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Info, Wifi, ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUpgradeModal } from '../../../lib/UpgradeModalContext'

export const Route = createFileRoute('/_app/settings/')({
  // General settings is hidden for now — not ready to ship. Send anyone landing
  // here (e.g. the sidebar Settings icon) to the first visible settings tab.
  beforeLoad: () => {
    throw redirect({ to: '/settings/organisation' })
  },
  component: SettingsIndexPage,
})

const TABS = ['General setting', 'Accessibility'] as const
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

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-[26px] w-[48px] shrink-0 items-center rounded-full transition-colors focus:outline-none',
        checked ? 'bg-[#0b66e4]' : 'bg-[#d1d5db]',
        disabled && 'opacity-60 cursor-default'
      )}
    >
      <span
        className={cn(
          'inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[24px]' : 'translate-x-[3px]'
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

  const selectedLocation = LOCATIONS.find((l) => l.label === location) ?? null

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-[8px] border border-[#9db7f4] p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[15px] font-semibold text-[#2e3240] tracking-[-0.3px]">Scan credit usage limit</span>
          <Toggle checked={creditEnabled} onChange={setCreditEnabled} />
        </div>

        {creditEnabled && (
          <>
            <div className="flex items-start gap-2.5 bg-[#e8f0fe] rounded-[6px] px-4 py-3 mb-5">
              <Info className="w-4 h-4 text-[#0b66e4] shrink-0 mt-0.5" />
              <span className="text-[13px] text-[#2e3240] leading-relaxed">
                Please set the max credits you can use in a single scan session. You can change this limit whenever you like.
              </span>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-medium text-[#2e3240] mb-2">Credit limit</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-[200px] px-3 py-2 border border-[#d1d5db] rounded-[6px] text-[14px] text-[#2e3240] focus:outline-none focus:border-[#0b66e4] focus:ring-1 focus:ring-[#0b66e4]"
              />
            </div>

            <button className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-medium rounded-[6px] transition-colors">
              Save changes
            </button>
          </>
        )}
      </div>

      <div className="bg-white rounded-[8px] border border-[#9db7f4] p-6">
        <h3 className="text-[15px] font-semibold text-[#2e3240] tracking-[-0.3px] mb-5">Select location and network</h3>

        <div className="mb-5">
          <label className="block text-[13px] font-medium text-[#2e3240] mb-2">
            Scan location<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative" style={{ width: 220 }}>
            <button
              type="button"
              onClick={() => { setLocationOpen(!locationOpen); setNetworkOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[14px] text-[#2e3240] hover:border-[#0b66e4] focus:outline-none focus:border-[#0b66e4] bg-white"
            >
              <span className="flex items-center gap-2">
                {selectedLocation ? (
                  <><span className="text-base">{selectedLocation.flag}</span><span>{selectedLocation.label}</span></>
                ) : (
                  <span className="text-[#9fa1a7]">Select location</span>
                )}
              </span>
              <ChevronDown className="w-4 h-4 text-[#73767f] shrink-0" />
            </button>
            {locationOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#e0e2e7] rounded-[6px] shadow-lg z-20 py-1 overflow-hidden">
                {LOCATIONS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLocation(l.label); setLocationOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-2 text-[14px] hover:bg-[#f5f7ff]',
                      location === l.label ? 'bg-[#eef2ff] text-[#0b66e4]' : 'text-[#2e3240]'
                    )}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-medium text-[#2e3240] mb-2">
            Select mobile network<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative" style={{ width: 220 }}>
            <button
              type="button"
              onClick={() => { setNetworkOpen(!networkOpen); setLocationOpen(false) }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-[#d1d5db] rounded-[6px] text-[14px] text-[#2e3240] hover:border-[#0b66e4] focus:outline-none focus:border-[#0b66e4] bg-white"
            >
              <span className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#73767f] shrink-0" />
                <span className={network ? 'text-[#2e3240]' : 'text-[#9fa1a7]'}>{network || 'Select network'}</span>
              </span>
              <ChevronDown className="w-4 h-4 text-[#73767f] shrink-0" />
            </button>
            {networkOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#e0e2e7] rounded-[6px] shadow-lg z-20 py-1 overflow-hidden">
                {NETWORKS.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setNetwork(n); setNetworkOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-2 text-[14px] hover:bg-[#f5f7ff]',
                      network === n ? 'bg-[#eef2ff] text-[#0b66e4]' : 'text-[#2e3240]'
                    )}
                  >
                    <Wifi className="w-4 h-4 text-[#73767f]" />
                    <span>{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="px-5 py-2.5 bg-[#0b66e4] hover:bg-[#0952c6] text-white text-[14px] font-medium rounded-[6px] transition-colors">
          Save changes
        </button>
      </div>
    </div>
  )
}

function AccessibilitySetting() {
  const { openUpgradeModal } = useUpgradeModal()
  return (
    <div className="space-y-4">
      <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[8px] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#fef3c7] border border-[#fcd34d] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#d97706]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#92400e]">Upgrade to unlock this feature</div>
            <div className="text-[13px] text-[#78350f] mt-0.5">Upgrade to unlock this feature</div>
          </div>
        </div>
        <button
          onClick={openUpgradeModal}
          className="shrink-0 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white text-[13px] font-semibold rounded-[6px] transition-colors whitespace-nowrap"
        >
          Upgrade now
        </button>
      </div>

      <div className="bg-white rounded-[8px] border border-[#e5e7eb] p-6 opacity-60 pointer-events-none select-none">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[15px] font-medium text-[#2e3240]">Enable Level AAA checks</span>
          <Toggle checked={false} disabled />
        </div>
        <div className="flex items-start gap-2.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-[6px] px-4 py-3">
          <Info className="w-4 h-4 text-[#9ca3af] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#6b7280] leading-relaxed">
            Enabling Level AAA checks will include AAA compliance scores and issues in your dashboard. If disabled, only Level AA compliance will be assessed.
          </p>
        </div>
      </div>
    </div>
  )
}

function SettingsIndexPage() {
  const [activeTab, setActiveTab] = useState<Tab>('General setting')

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.44px]">Website Settings</h1>
        <p className="text-[13px] text-[#73767f] mt-1">Manage the advanced settings for your website.</p>
      </div>

      <div className="bg-white border-b border-[#d8dde9] px-4 sm:px-6 mt-3">
        <div className="flex overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                'px-4 py-3.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === t
                  ? 'border-[#0b66e4] text-[#242424] font-semibold'
                  : 'border-transparent text-[#73767f] font-normal hover:text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6">
        {activeTab === 'General setting' && <GeneralSetting />}
        {activeTab === 'Accessibility' && <AccessibilitySetting />}
      </div>
    </div>
  )
}
