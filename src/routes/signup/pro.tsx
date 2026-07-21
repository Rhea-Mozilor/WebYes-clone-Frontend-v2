import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '../../components/SignupForm'

export const Route = createFileRoute('/signup/pro')({
  component: SignupProPage,
})

function SignupProPage() {
  return (
    <SignupForm
      plan="pro"
      heading="Start your 3 day free trial"
      subtitle="Free for 3 days, then $59/Month. Cancel anytime."
      submitLabel="Get Started"
    />
  )
}
