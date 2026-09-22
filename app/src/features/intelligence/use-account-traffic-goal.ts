import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

// Sums traffic_goal_clicks across every project on the account — same
// "account-wide, not attributable to a single engagement" honesty note
// as the project workspace's Traffic & conversions vs goal card
// (Stage 4 tracks one Search Console property per client, not per
// project). Null if no project on the account has a goal set, rather
// than treating an unset goal as zero.
export function useAccountTrafficGoal(accountId: string | undefined) {
  return useQuery({
    queryKey: ['account-traffic-goal', accountId],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('projects')
        .select('traffic_goal_clicks')
        .eq('account_id', accountId!)
      if (error) throw new Error(error.message)
      const goals = (data ?? []).map((p) => p.traffic_goal_clicks).filter((g): g is number => g != null)
      return goals.length > 0 ? goals.reduce((s, g) => s + g, 0) : null
    },
    enabled: !!accountId,
  })
}
