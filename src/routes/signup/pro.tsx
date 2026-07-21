import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/signup/pro')({
  beforeLoad: () => {
    throw redirect({ to: '/signup', search: { trial: 'pro' } })
  },
})
