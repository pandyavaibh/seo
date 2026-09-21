import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ConnectionStatus } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface ConnectionInfo {
  id: string | null
  property: string | null
  status: ConnectionStatus
  lastSyncedAt: string | null
}

export interface DailyPoint {
  date: string
  clicks: number
  impressions: number
  ctr: number
  avgPosition: number
}

export interface DimensionRow {
  key: string
  clicks: number
  impressions: number
  ctr: number
  avgPosition: number
}

export interface Ga4Point {
  date: string
  sessions: number
  conversions: number
  engagementRate: number
}

export interface Ga4ChannelRow {
  channel: string
  sessions: number
  conversions: number
}

export interface Ga4LandingPageRow {
  landingPage: string
  sessions: number
  engagedSessions: number
  conversions: number
}

export interface SearchPerformanceData {
  gsc: ConnectionInfo
  ga4: ConnectionInfo
  gscDaily: DailyPoint[]
  queries: DimensionRow[]
  pages: DimensionRow[]
  countries: DimensionRow[]
  devices: DimensionRow[]
  ga4Daily: Ga4Point[]
  ga4Channels: Ga4ChannelRow[]
  ga4LandingPages: Ga4LandingPageRow[]
}

const EMPTY_CONNECTION: ConnectionInfo = {
  id: null,
  property: null,
  status: 'needs_access',
  lastSyncedAt: null,
}

// queries/pages/countries/devices/landing pages are all synced as a
// single "as of today" snapshot each sync (see the Edge Function) —
// this picks the latest snapshot_date's rows out of a table that may
// hold several days of history, sorted by whatever ranks rows for that
// dimension (clicks for GSC tables, sessions for GA4).
function latestSnapshot<T extends { snapshot_date: string }>(
  rows: T[],
  rank: (row: T) => number,
  limit: number,
): T[] {
  if (rows.length === 0) return []
  const latestDate = rows.reduce((max, r) => (r.snapshot_date > max ? r.snapshot_date : max), rows[0].snapshot_date)
  return rows
    .filter((r) => r.snapshot_date === latestDate)
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit)
}

export function useSearchPerformance(accountId: string | undefined) {
  return useQuery({
    queryKey: ['search-performance', accountId],
    queryFn: async (): Promise<SearchPerformanceData> => {
      const [
        connRes,
        snapshotRes,
        queryRes,
        pageRes,
        countryRes,
        deviceRes,
        channelRes,
        landingPageRes,
      ] = await Promise.all([
        supabase
          .from('search_connections')
          .select('id, source, property, status, last_synced_at')
          .eq('account_id', accountId!),
        supabase
          .from('metric_snapshots')
          .select('source, snapshot_date, metric_key, value')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: true }),
        supabase
          .from('search_queries_daily')
          .select('snapshot_date, query, clicks, impressions, ctr, avg_position')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(200),
        supabase
          .from('search_pages_daily')
          .select('snapshot_date, page, clicks, impressions, ctr, avg_position')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(200),
        supabase
          .from('search_countries_daily')
          .select('snapshot_date, country, clicks, impressions, ctr, avg_position')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(200),
        supabase
          .from('search_devices_daily')
          .select('snapshot_date, device, clicks, impressions, ctr, avg_position')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(50),
        supabase
          .from('ga4_channels_daily')
          .select('snapshot_date, channel, sessions, conversions')
          .eq('account_id', accountId!),
        supabase
          .from('ga4_landing_pages_daily')
          .select('snapshot_date, landing_page, sessions, engaged_sessions, conversions')
          .eq('account_id', accountId!)
          .order('snapshot_date', { ascending: false })
          .limit(200),
      ])

      for (const res of [connRes, snapshotRes, queryRes, pageRes, countryRes, deviceRes, channelRes, landingPageRes]) {
        if (res.error) throw new Error(res.error.message)
      }

      const gscRow = connRes.data?.find((c) => c.source === 'gsc')
      const ga4Row = connRes.data?.find((c) => c.source === 'ga4')

      const gsc: ConnectionInfo = gscRow
        ? { id: gscRow.id, property: gscRow.property, status: gscRow.status, lastSyncedAt: gscRow.last_synced_at }
        : EMPTY_CONNECTION
      const ga4: ConnectionInfo = ga4Row
        ? { id: ga4Row.id, property: ga4Row.property, status: ga4Row.status, lastSyncedAt: ga4Row.last_synced_at }
        : EMPTY_CONNECTION

      const gscByDate = new Map<string, Partial<DailyPoint>>()
      const ga4ByDate = new Map<string, Partial<Ga4Point>>()
      for (const row of snapshotRes.data ?? []) {
        if (row.source === 'gsc') {
          const entry = gscByDate.get(row.snapshot_date) ?? { date: row.snapshot_date }
          if (row.metric_key === 'clicks') entry.clicks = row.value
          if (row.metric_key === 'impressions') entry.impressions = row.value
          if (row.metric_key === 'ctr') entry.ctr = row.value
          if (row.metric_key === 'avg_position') entry.avgPosition = row.value
          gscByDate.set(row.snapshot_date, entry)
        } else {
          const entry = ga4ByDate.get(row.snapshot_date) ?? { date: row.snapshot_date }
          if (row.metric_key === 'sessions') entry.sessions = row.value
          if (row.metric_key === 'conversions') entry.conversions = row.value
          if (row.metric_key === 'engagement_rate') entry.engagementRate = row.value
          ga4ByDate.set(row.snapshot_date, entry)
        }
      }

      const gscDaily = Array.from(gscByDate.values()).map((d) => ({
        date: d.date!,
        clicks: d.clicks ?? 0,
        impressions: d.impressions ?? 0,
        ctr: d.ctr ?? 0,
        avgPosition: d.avgPosition ?? 0,
      }))
      const ga4Daily = Array.from(ga4ByDate.values()).map((d) => ({
        date: d.date!,
        sessions: d.sessions ?? 0,
        conversions: d.conversions ?? 0,
        engagementRate: d.engagementRate ?? 0,
      }))

      const queries = latestSnapshot(queryRes.data ?? [], (r) => r.clicks, 10).map((q) => ({
        key: q.query,
        clicks: q.clicks,
        impressions: q.impressions,
        ctr: q.ctr,
        avgPosition: q.avg_position,
      }))
      const pages = latestSnapshot(pageRes.data ?? [], (r) => r.clicks, 10).map((p) => ({
        key: p.page,
        clicks: p.clicks,
        impressions: p.impressions,
        ctr: p.ctr,
        avgPosition: p.avg_position,
      }))
      const countries = latestSnapshot(countryRes.data ?? [], (r) => r.clicks, 10).map((c) => ({
        key: c.country,
        clicks: c.clicks,
        impressions: c.impressions,
        ctr: c.ctr,
        avgPosition: c.avg_position,
      }))
      const devices = latestSnapshot(deviceRes.data ?? [], (r) => r.clicks, 10).map((d) => ({
        key: d.device,
        clicks: d.clicks,
        impressions: d.impressions,
        ctr: d.ctr,
        avgPosition: d.avg_position,
      }))

      const channelTotals = new Map<string, { sessions: number; conversions: number }>()
      for (const row of channelRes.data ?? []) {
        const entry = channelTotals.get(row.channel) ?? { sessions: 0, conversions: 0 }
        entry.sessions += row.sessions
        entry.conversions += row.conversions
        channelTotals.set(row.channel, entry)
      }
      const ga4Channels = Array.from(channelTotals, ([channel, v]) => ({ channel, ...v })).sort(
        (a, b) => b.sessions - a.sessions,
      )

      const ga4LandingPages = latestSnapshot(landingPageRes.data ?? [], (r) => r.sessions, 10).map((p) => ({
        landingPage: p.landing_page,
        sessions: p.sessions,
        engagedSessions: p.engaged_sessions,
        conversions: p.conversions,
      }))

      return { gsc, ga4, gscDaily, queries, pages, countries, devices, ga4Daily, ga4Channels, ga4LandingPages }
    },
    enabled: !!accountId,
  })
}

export function useSetSearchConnection(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ source, property }: { source: 'gsc' | 'ga4'; property: string }) => {
      const { error } = await supabase
        .from('search_connections')
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
      queryClient.invalidateQueries({ queryKey: ['search-performance', accountId] })
    },
  })
}

export function useSyncSearchPerformance(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-search-performance', {
        body: { accountId },
      })
      if (error) throw new Error(error.message)
      return data as { results?: Record<string, { status: string; error?: string }>; error?: string }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-performance', accountId] })
    },
  })
}
