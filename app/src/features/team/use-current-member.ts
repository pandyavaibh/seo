import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

// Whether the signed-in Google account is a row in team_members (and
// therefore has any RLS-granted access at all). A 0-row result here is
// the expected, correct outcome for an outside account — never an error.
export function useCurrentMember() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['current-member', session?.user.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('id, email, name, role, active')
        .eq('email', session!.user.email!.toLowerCase())
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data
    },
    enabled: !!session?.user.email,
  })
}
