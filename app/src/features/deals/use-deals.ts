import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { DealStage } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface DealRow {
  id: string
  name: string
  stage: DealStage
  accountId: string | null
  accountName: string | null
  valueCents: number | null
  source: string | null
  ownerId: string | null
  ownerName: string | null
  expectedClose: string | null
}

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: async (): Promise<DealRow[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select(
          'id, name, stage, value_cents, source, expected_close, account_id, owner_id, accounts(name), team_members(name)',
        )
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)

      return (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        stage: d.stage,
        accountId: d.account_id,
        accountName: d.accounts?.name ?? null,
        valueCents: d.value_cents,
        source: d.source,
        ownerId: d.owner_id,
        ownerName: d.team_members?.name ?? null,
        expectedClose: d.expected_close,
      }))
    },
  })
}

export interface NewDealInput {
  name: string
  accountId: string
  valueDollars: string
  source: string
  ownerId: string
  expectedClose: string
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewDealInput) => {
      const { error } = await supabase.from('deals').insert({
        name: input.name.trim(),
        account_id: input.accountId || null,
        value_cents: input.valueDollars ? Math.round(Number(input.valueDollars) * 100) : null,
        source: input.source.trim() || null,
        owner_id: input.ownerId || null,
        expected_close: input.expectedClose || null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; stage: DealStage; lostReason?: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({
          stage: input.stage,
          lost_reason: input.stage === 'lost' ? input.lostReason ?? null : null,
        })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    },
  })
}
