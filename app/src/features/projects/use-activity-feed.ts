import { useQuery } from '@tanstack/react-query'

import type { ActivityGroup } from '@/features/checklist/use-offpage'
import { supabase } from '@/lib/supabase'

// A single combined, chronological view of everything logged through the
// Activity dropdown (Backlinks / On-Page / Technical) plus hours — so
// staff can see at a glance what happened on a client without checking
// four separate sections. Keyword checks aren't included: the Keywords
// matrix already is that history, and folding 2,000+ rank checks in here
// would drown out everything else.
export interface ActivityFeedItem {
  id: string
  date: string
  kind: ActivityGroup | 'hours'
  label: string
  detail: string | null
  byName: string | null
}

export function useActivityFeed(projectId: string | undefined) {
  return useQuery({
    queryKey: ['activity-feed', projectId],
    queryFn: async (): Promise<ActivityFeedItem[]> => {
      const [typesRes, entriesRes, hoursRes] = await Promise.all([
        supabase.from('offpage_activity_types').select('activity_type, activity_group'),
        supabase
          .from('offpage_activity_entries')
          .select('id, activity_type, entry_date, count, note, team_members(name)')
          .eq('project_id', projectId!)
          .order('entry_date', { ascending: false })
          .limit(100),
        supabase
          .from('time_entries')
          .select('id, hours, worked_on, note, team_members(name)')
          .eq('project_id', projectId!)
          .order('worked_on', { ascending: false })
          .limit(100),
      ])
      if (typesRes.error) throw new Error(typesRes.error.message)
      if (entriesRes.error) throw new Error(entriesRes.error.message)
      if (hoursRes.error) throw new Error(hoursRes.error.message)

      const groupByType = new Map(
        (typesRes.data ?? []).map((t) => [t.activity_type, t.activity_group as ActivityGroup]),
      )

      const fromEntries: ActivityFeedItem[] = (entriesRes.data ?? []).map((e) => ({
        id: `entry-${e.id}`,
        date: e.entry_date,
        kind: groupByType.get(e.activity_type) ?? 'backlinks',
        label: e.activity_type,
        detail: `+${e.count}${e.note ? ` — ${e.note}` : ''}`,
        byName: e.team_members?.name ?? null,
      }))

      const fromHours: ActivityFeedItem[] = (hoursRes.data ?? []).map((h) => ({
        id: `hours-${h.id}`,
        date: h.worked_on,
        kind: 'hours',
        label: `${h.hours}h logged`,
        detail: h.note,
        byName: h.team_members?.name ?? null,
      }))

      return [...fromEntries, ...fromHours]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 100)
    },
    enabled: !!projectId,
  })
}
