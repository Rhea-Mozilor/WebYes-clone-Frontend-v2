import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '../components/SignupForm'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  return (
    <SignupForm
      plan="free"
      heading="Create your account"
      subtitle={null}
      submitLabel="Sign Up for Free"
    />
  )
}
