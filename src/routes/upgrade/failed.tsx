import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/upgrade/failed')({
  component: PaymentFailedPage,
})

function BrokenPaymentIcon() {
  return (
    <div className="relative w-24 h-24 mx-auto">
      <div className="absolute top-0 right-2 w-9 h-9 bg-[#c62828] rotate-[18deg] rounded-[2px]" />
      <div className="absolute bottom-1 left-2 w-11 h-11 bg-[#e53935] rotate-[-15deg] rounded-[2px]" />
      <div className="absolute bottom-2 right-1 w-11 h-11 bg-[#f4a6a6] opacity-80 rotate-[18deg] rounded-[2px]" />
    </div>
  )
}

function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[680px] bg-[#eaf0fe] rounded-2xl px-10 py-14 text-center">
        <h1 className="text-[28px] font-bold text-[#2e3240]">Payment failed</h1>
        <p className="text-[15px] text-gray-500 mt-1">We couldn't process your payment.</p>

        <div className="my-10">
          <BrokenPaymentIcon />
        </div>

        <p className="text-[15px] text-[#2e3240]">
          Please try again using a different payment method, or contact your bank.
        </p>

        <Link
          to="/dashboard"
          className="inline-block w-full max-w-[380px] mt-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[15px] font-semibold rounded-lg transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
