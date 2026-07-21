import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '../../components/SignupForm'

type TrialParam = 'pro' | 'enterprise' | 'false'

export const Route = createFileRoute('/signup/')({
  validateSearch: (search: Record<string, unknown>): { trial?: TrialParam } => {
    const trial = search.trial
    return trial === 'pro' || trial === 'enterprise' || trial === 'false'
      ? { trial }
      : {}
  },
  component: SignupPage,
})

const VARIANTS = {
  pro: {
    plan: 'pro' as const,
    heading: 'Start your 3 day free trial',
    subtitle: 'Free for 3 days, then $59/Month. Cancel anytime.',
    submitLabel: 'Get Started',
  },
  enterprise: {
    plan: 'enterprise' as const,
    heading: 'Start your 3 day free trial',
    subtitle: 'Free for 3 days, then billed at your custom Enterprise rate. Cancel anytime.',
    submitLabel: 'Get Started',
  },
  free: {
    plan: 'free' as const,
    heading: 'Create your account',
    subtitle: null,
    submitLabel: 'Sign Up for Free',
  },
}

function SignupPage() {
  const { trial } = Route.useSearch()
  const variant = trial === 'pro' || trial === 'enterprise' ? VARIANTS[trial] : VARIANTS.free

  return (
    <SignupForm
      plan={variant.plan}
      heading={variant.heading}
      subtitle={variant.subtitle}
      submitLabel={variant.submitLabel}
    />
  )
}
