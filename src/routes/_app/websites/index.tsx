import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/websites/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
  component: () => null,
})
