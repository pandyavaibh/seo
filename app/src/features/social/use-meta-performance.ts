import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ConnectionStatus, MetaSource } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface ConnectionInfo {
  id: string | null
  property: string | null
  status: ConnectionStatus
  lastSyncedAt: string | null
}

export interface OrganicDailyPoint {
  date: string
  fbReach: number
  fbEngagement: number
  igReach: number
  igEngagement: number
}

export interface PostRow {
  postId: string
  platform: 'facebook_page' | 'instagram'
  permalink: string | null
  caption: string | null
  publishedAt: string | null
  reach: number
  engagement: number
  likes: number
  comments: number
  shares: number
}

export interface CampaignRow {
  campaignId: string
  campaignName: string
  spendCents: number
  impressions: number
  clicks: number
  leads: number
}

export interface MetaPerformanceData {
  facebookPage: ConnectionInfo
  instagram: ConnectionInfo
  ads: ConnectionInfo
  organicDaily: OrganicDailyPoint[]
  fbFollowers: number | null
  igFollowers: number | null
  posts: PostRow[]
  campaigns: CampaignRow[]
  adTotals: { spendCents: number; impressions: number; clicks: number; leads: number }
  ga4Conversions28d: number | null
}

const EMPTY_CONNECTION: ConnectionInfo = {
  id: null,
  property: null,
  status: 'needs_access',
  lastSyncedAt: null,
}

export function useMetaPerformance(accountId: string | undefined) {
  return useQuery({
    queryKey: ['meta-performance', accountId],
    queryFn: async (): Promise<MetaPerformanceData> => {
      const [connRes, snapshotRes, postsRes, campaignsRes, ga4Res] = await Promise.all([
        supabase
          .from('meta_connections')
          .select('id, source, property, status, last_synced_at')
          .eq('account_id', accountId!),
        supabase
          .from('metric_snapshots')
          .select('snapshot_date, metric_key, value')
          .eq('account_id', accountId!)
          .eq('source', 'meta')
          .order('snapshot_date', { ascending: true }),
        supabase
          .from('meta_posts_daily')
          .select('snapshot_date, post_id, platform, permalink, caption, published_at, reach, engagement, likes, comments, shares')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(50),
        supabase
          .from('meta_campaigns_daily')
          .select('snapshot_date, campaign_id, campaign_name, spend_cents, impressions, clicks, leads')
          .eq('account_id', accountId!),
        supabase
          .from('metric_snapshots')
          .select('value')
          .eq('account_id', accountId!)
          .eq('source', 'ga4')
          .eq('metric_key', 'conversions'),
      ])

      for (const res of [connRes, snapshotRes, postsRes, campaignsRes, ga4Res]) {
        if (res.error) throw new Error(res.error.message)
      }

      const bySource = (source: MetaSource): ConnectionInfo => {
        const row = connRes.data?.find((c) => c.source === source)
        return row
          ? { id: row.id, property: row.property, status: row.status, lastSyncedAt: row.last_synced_at }
          : EMPTY_CONNECTION
      }

      const byDate = new Map<string, OrganicDailyPoint>()
      let fbFollowers: number | null = null
      let igFollowers: number | null = null
      let adSpend = 0
      let adImpressions = 0
      let adClicks = 0
      let adLeads = 0
      for (const row of snapshotRes.data ?? []) {
        const entry = byDate.get(row.snapshot_date) ?? {
          date: row.snapshot_date,
          fbReach: 0,
          fbEngagement: 0,
          igReach: 0,
          igEngagement: 0,
        }
        if (row.metric_key === 'fb_reach') entry.fbReach = row.value
        if (row.metric_key === 'fb_engagement') entry.fbEngagement = row.value
        if (row.metric_key === 'ig_reach') entry.igReach = row.value
        if (row.metric_key === 'ig_engagement') entry.igEngagement = row.value
        byDate.set(row.snapshot_date, entry)

        if (row.metric_key === 'fb_followers') fbFollowers = row.value
        if (row.metric_key === 'ig_followers') igFollowers = row.value
        if (row.metric_key === 'ad_spend_cents') adSpend = row.value
        if (row.metric_key === 'ad_impressions') adImpressions = row.value
        if (row.metric_key === 'ad_clicks') adClicks = row.value
        if (row.metric_key === 'ad_leads') adLeads = row.value
      }

      const postsLatestDate = (postsRes.data ?? []).reduce(
        (max, r) => (r.snapshot_date > max ? r.snapshot_date : max),
        (postsRes.data ?? [])[0]?.snapshot_date ?? '',
      )
      const posts: PostRow[] = (postsRes.data ?? [])
        .filter((r) => r.snapshot_date === postsLatestDate)
        .sort((a, b) => b.reach - a.reach)
        .slice(0, 10)
        .map((p) => ({
          postId: p.post_id,
          platform: p.platform,
          permalink: p.permalink,
          caption: p.caption,
          publishedAt: p.published_at,
          reach: p.reach,
          engagement: p.engagement,
          likes: p.likes,
          comments: p.comments,
          shares: p.shares,
        }))

      const campaignTotals = new Map<string, CampaignRow>()
      for (const row of campaignsRes.data ?? []) {
        const entry = campaignTotals.get(row.campaign_id) ?? {
          campaignId: row.campaign_id,
          campaignName: row.campaign_name,
          spendCents: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
        }
        entry.spendCents += row.spend_cents
        entry.impressions += row.impressions
        entry.clicks += row.clicks
        entry.leads += row.leads
        campaignTotals.set(row.campaign_id, entry)
      }
      const campaigns = Array.from(campaignTotals.values()).sort((a, b) => b.spendCents - a.spendCents)

      const ga4Conversions28d = (ga4Res.data ?? []).length > 0
        ? (ga4Res.data ?? []).reduce((s, r) => s + Number(r.value), 0)
        : null

      return {
        facebookPage: bySource('facebook_page'),
        instagram: bySource('instagram'),
        ads: bySource('ads'),
        organicDaily: Array.from(byDate.values()),
        fbFollowers,
        igFollowers,
        posts,
        campaigns,
        adTotals: { spendCents: adSpend, impressions: adImpressions, clicks: adClicks, leads: adLeads },
        ga4Conversions28d,
      }
    },
    enabled: !!accountId,
  })
}

export function useSetMetaConnection(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ source, property }: { source: MetaSource; property: string }) => {
      const { error } = await supabase
        .from('meta_connections')
        .upsert(
          {
            account_id: accountId,
            source,
            property,
            status: 'needs_access',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'account_id,source' },
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-performance', accountId] })
    },
  })
}

export function useSyncMetaPerformance(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-meta-performance', {
        body: { accountId },
      })
      if (error) throw new Error(error.message)
      return data as { results?: Record<string, { status: string; error?: string }>; error?: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-performance', accountId] })
    },
  })
}
