import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getOnboardingDone } from '../lib/storage'

export function RequireOnboarding({ children }: { children: ReactNode }) {
  if (!getOnboardingDone()) {
    return <Navigate to="/onboard" replace />
  }
  return children
}
