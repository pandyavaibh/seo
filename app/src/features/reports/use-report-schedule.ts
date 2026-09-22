import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface ReportSchedule {
  id: string
  recipientEmail: string
  sendDay: number
  active: boolean
  lastSentPeriodEnd: string | null
}

export function useReportSchedule(accountId: string | undefined) {
  return useQuery({
    queryKey: ['report-schedule', accountId],
    queryFn: async (): Promise<ReportSchedule | null> => {
      const { data, error } = await supabase
        .from('report_schedules')
        .select('id, recipient_email, send_day, active, last_sent_period_end')
        .eq('account_id', accountId!)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      return {
        id: data.id,
        recipientEmail: data.recipient_email,
        sendDay: data.send_day,
        active: data.active,
        lastSentPeriodEnd: data.last_sent_period_end,
      }
    },
    enabled: !!accountId,
  })
}

export function useSaveReportSchedule(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string | null; recipientEmail: string; sendDay: number }) => {
      if (input.id) {
        const { error } = await supabase
          .from('report_schedules')
          .update({ recipient_email: input.recipientEmail, send_day: input.sendDay, active: true })
          .eq('id', input.id)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('report_schedules')
          .insert({ account_id: accountId, recipient_email: input.recipientEmail, send_day: input.sendDay })
        if (error) throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedule', accountId] })
    },
  })
}

export function useSetReportScheduleActive(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase.from('report_schedules').update({ active: input.active }).eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedule', accountId] })
    },
  })
}
