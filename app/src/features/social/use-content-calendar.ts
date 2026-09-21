import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ContentCalendarPlatform, ContentCalendarStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface CalendarItem {
  id: string
  projectId: string | null
  platform: ContentCalendarPlatform
  caption: string | null
  scheduledOn: string | null
  ownerId: string | null
  ownerName: string | null
  status: ContentCalendarStatus
  permalink: string | null
}

export function useContentCalendar(accountId: string | undefined) {
  return useQuery({
    queryKey: ['content-calendar', accountId],
    queryFn: async (): Promise<CalendarItem[]> => {
      const { data, error } = await supabase
        .from('content_calendar')
        .select('id, project_id, platform, caption, scheduled_on, owner_id, status, permalink, team_members(name)')
        .eq('account_id', accountId!)
        .order('scheduled_on', { ascending: true, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((c) => ({
        id: c.id,
        projectId: c.project_id,
        platform: c.platform,
        caption: c.caption,
        scheduledOn: c.scheduled_on,
        ownerId: c.owner_id,
        ownerName: c.team_members?.name ?? null,
        status: c.status,
        permalink: c.permalink,
      }))
    },
    enabled: !!accountId,
  })
}

export interface NewCalendarItemInput {
  platform: ContentCalendarPlatform
  caption: string
  scheduledOn: string
  ownerId: string | null
}

export function useCreateCalendarItem(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewCalendarItemInput) => {
      const { error } = await supabase.from('content_calendar').insert({
        account_id: accountId,
        platform: input.platform,
        caption: input.caption.trim() || null,
        scheduled_on: input.scheduledOn || null,
        owner_id: input.ownerId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-calendar', accountId] })
    },
  })
}

export function useUpdateCalendarStatus(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: ContentCalendarStatus }) => {
      const { error } = await supabase
        .from('content_calendar')
        .update({ status: input.status })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-calendar', accountId] })
    },
  })
}

export function useDeleteCalendarItem(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('content_calendar').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-calendar', accountId] })
    },
  })
}
