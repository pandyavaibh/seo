import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { WebhookEventType } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface ApiKeyRow {
  id: string
  accountId: string | null
  accountName: string | null
  label: string
  keyPrefix: string
  createdAt: string
  revokedAt: string | null
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async (): Promise<ApiKeyRow[]> => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, account_id, label, key_prefix, created_at, revoked_at, accounts(name)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((k) => ({
        id: k.id,
        accountId: k.account_id,
        accountName: k.accounts?.name ?? null,
        label: k.label,
        keyPrefix: k.key_prefix,
        createdAt: k.created_at,
        revokedAt: k.revoked_at,
      }))
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { accountId: string | null; label: string }) => {
      const { data, error } = await supabase.rpc('create_api_key', {
        p_account_id: input.accountId,
        p_label: input.label.trim(),
      })
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })
}

export interface WebhookRow {
  id: string
  accountId: string | null
  accountName: string | null
  url: string
  eventType: WebhookEventType
  active: boolean
  createdAt: string
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async (): Promise<WebhookRow[]> => {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('id, account_id, url, event_type, active, created_at, accounts(name)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((w) => ({
        id: w.id,
        accountId: w.account_id,
        accountName: w.accounts?.name ?? null,
        url: w.url,
        eventType: w.event_type,
        active: w.active,
        createdAt: w.created_at,
      }))
    },
  })
}

function randomSecret() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { accountId: string | null; url: string; eventType: WebhookEventType }) => {
      const secret = randomSecret()
      const { error } = await supabase.from('webhook_subscriptions').insert({
        account_id: input.accountId,
        url: input.url.trim(),
        event_type: input.eventType,
        secret,
      })
      if (error) throw new Error(error.message)
      return secret
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useToggleWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; active: boolean }) => {
      const { error } = await supabase.from('webhook_subscriptions').update({ active: input.active }).eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhook_subscriptions').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
    },
  })
}
