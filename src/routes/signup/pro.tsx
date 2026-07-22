import { createFileRoute } from '@tanstack/react-router'
import { SignupForm } from '../../components/SignupForm'

export const Route = createFileRoute('/signup/pro')({
  component: SignupProPage,
})

