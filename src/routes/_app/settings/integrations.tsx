import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/settings/integrations')({
  component: IntegrationsPage,
})

function IntegrationsPage() {
  return (
    <div className="p-6">
      <h1 className="text-[22px] font-semibold text-[#2e3240] tracking-[-0.44px] mb-2">Integrations</h1>
      <p className="text-[13px] text-[#73767f]">Integrations coming soon.</p>
    </div>
  )
}
