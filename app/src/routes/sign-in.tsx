import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'

export function SignInPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[12px] p-8 flex flex-col items-center gap-4 max-w-[360px] text-center">
        <span className="w-[36px] h-[36px] rounded-[9px] bg-brand grid place-items-center font-mono text-[15px] font-semibold text-white">
          S
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[18px] font-semibold">SEO CRM</h1>
          <p className="m-0 text-[13px] text-ink-muted">
            Internal tool — sign in with your team Google account.
          </p>
        </div>
        <Button onClick={signInWithGoogle}>Sign in with Google</Button>
      </div>
    </div>
  )
}
