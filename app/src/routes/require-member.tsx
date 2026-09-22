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

// Stage 7: a client-role member is a valid, active team_members row —
// RequireMember lets them through — but the staff app (accounts,
// projects, capacity, rates) is never theirs to see. Wrapped around the
// staff route tree, inside RequireMember.
export function RequireStaff() {
  const { data: member, isLoading } = useCurrentMember()
  if (isLoading) return null
  if (member?.role === 'client') return <Navigate to="/portal" replace />
  return <Outlet />
}

// The inverse: the client portal is only for role='client'. A staff
// member hitting /portal goes back to the staff app instead.
export function RequirePortal() {
  const { data: member, isLoading } = useCurrentMember()
  if (isLoading) return null
  if (member?.role !== 'client') return <Navigate to="/clients" replace />
  return <Outlet />
}
