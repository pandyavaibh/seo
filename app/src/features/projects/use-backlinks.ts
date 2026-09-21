import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { BacklinkStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface BacklinkRow {
  id: string
  domain: string
  sourceUrl: string | null
  targetUrl: string | null
  anchorText: string | null
  status: BacklinkStatus
  costCents: number | null
  contactEmail: string | null
  notes: string | null
  ownerId: string | null
  ownerName: string | null
  placedOn: string | null
}

export interface BacklinkStats {
  total: number
  placed: number
  outreach: number
  prospect: number
}

export interface BacklinksData {
  rows: BacklinkRow[]
  stats: BacklinkStats
}

export function useBacklinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['backlinks', projectId],
    queryFn: async (): Promise<BacklinksData> => {
      const { data, error } = await supabase
        .from('backlinks')
        .select(
          'id, domain, source_url, target_url, anchor_text, status, cost_cents, contact_email, notes, owner_id, placed_on, team_members(name)',
        )
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)

      const rows: BacklinkRow[] = (data ?? []).map((b) => ({
        id: b.id,
        domain: b.domain,
        sourceUrl: b.source_url,
        targetUrl: b.target_url,
        anchorText: b.anchor_text,
        status: b.status,
        costCents: b.cost_cents,
        contactEmail: b.contact_email,
        notes: b.notes,
        ownerId: b.owner_id,
        ownerName: b.team_members?.name ?? null,
        placedOn: b.placed_on,
      }))

      return {
        rows,
        stats: {
          total: rows.length,
          placed: rows.filter((r) => r.status === 'placed').length,
          outreach: rows.filter((r) => r.status === 'outreach').length,
          prospect: rows.filter((r) => r.status === 'prospect').length,
        },
      }
    },
    enabled: !!projectId,
  })
}

export interface NewBacklinkInput {
  domain: string
  targetUrl: string
  anchorText: string
  ownerId: string | null
}

export function useAddBacklink(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewBacklinkInput) => {
      const { error } = await supabase.from('backlinks').insert({
        project_id: projectId,
        domain: input.domain.trim(),
        target_url: input.targetUrl.trim() || null,
        anchor_text: input.anchorText.trim() || null,
        owner_id: input.ownerId,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] })
    },
  })
}

export interface BacklinkUpdateInput {
  id: string
  status?: BacklinkStatus
  sourceUrl?: string | null
  costCents?: number | null
  placedOn?: string | null
}

export function useUpdateBacklink(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: BacklinkUpdateInput) => {
      const { id, status, sourceUrl, costCents, placedOn } = input
      const patch: {
        status?: BacklinkStatus
        source_url?: string | null
        cost_cents?: number | null
        placed_on?: string | null
      } = {}
      if (status !== undefined) patch.status = status
      if (sourceUrl !== undefined) patch.source_url = sourceUrl
      if (costCents !== undefined) patch.cost_cents = costCents
      if (placedOn !== undefined) patch.placed_on = placedOn
      const { error } = await supabase.from('backlinks').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] })
    },
  })
}

export function useDeleteBacklink(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('backlinks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlinks', projectId] })
    },
  })
}
