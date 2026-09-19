import { useAuth } from '@/providers/auth-provider'

// Shown to a signed-in Google account that RLS won't return anything for
// (not in team_members, or deactivated) — the Stage 0.1 exit criterion in
// UI form: no silent blank screen, no client-side isAdmin() decision.
export function UnauthorizedPage() {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[12px] p-8 flex flex-col items-center gap-3 max-w-[380px] text-center">
        <h1 className="m-0 text-[16px] font-semibold">
          {session?.user.email} isn't set up on this team
        </h1>
        <p className="m-0 text-[13px] text-ink-muted">
          Every table here is protected by row-level security — signing in
          only proves who you are, not that you should see anything. Ask an
          admin to add you to team_members.
        </p>
        <button
          onClick={signOut}
          className="text-[12px] font-mono text-ink-muted hover:text-ink cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
