import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentMember } from '@/features/team/use-current-member'
import { useAuth } from '@/providers/auth-provider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Navigate to="/sign-in" replace />
  return <Outlet />
}

// Separate from RequireAuth: being signed in and being an allowed team
// member are different facts, and Stage 0.1's exit criterion is that an
// outside Google account (signed in, but absent from team_members or
// deactivated) retrieves nothing — this is where that shows up in the UI
// instead of an indefinite spinner or a blank board.
export function RequireMember() {
  const { data: member, isLoading, isError } = useCurrentMember()
  if (isLoading) return null
  if (isError || !member || !member.active) {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}
