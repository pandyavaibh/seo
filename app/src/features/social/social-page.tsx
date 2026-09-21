import { AlertTriangle, ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAccount } from '@/features/accounts/use-account'
import {
  useMetaPerformance,
  useSetMetaConnection,
  useSyncMetaPerformance,
  type CampaignRow,
  type ConnectionInfo,
  type PostRow,
} from '@/features/social/use-meta-performance'
import type { MetaSource } from '@/lib/database.types'

function windowTotal(values: number[]) {
  return values.reduce((s, v) => s + v, 0)
}

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface border border-border rounded-[12px] p-[14px_16px] flex flex-col gap-[6px]">
      <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">{label}</span>
      <span className="text-[23px] font-semibold tracking-[-0.02em] leading-none">{value}</span>
      {note && <span className="text-[11.5px] font-medium text-ink-muted">{note}</span>}
    </div>
  )
}

function ConnectionPill({ label, info }: { label: string; info: ConnectionInfo }) {
  const granted = info.status === 'granted'
  return (
    <Badge tone={granted ? 'green' : 'amber'} className="flex items-center gap-[6px] px-[11px] py-[5px]">
      <span className="w-[6px] h-[6px] rounded-full" style={{ background: 'currentColor' }} />
      {label} — {granted ? 'Access granted' : 'Needs access'}
    </Badge>
  )
}

function ConnectionSetupCard({
  accountId,
  source,
  label,
  info,
  placeholder,
  helpText,
}: {
  accountId: string
  source: MetaSource
  label: string
  info: ConnectionInfo
  placeholder: string
  helpText: string
}) {
  const [property, setProperty] = React.useState(info.property ?? '')
  const setConnection = useSetMetaConnection(accountId)
  const sync = useSyncMetaPerformance(accountId)
  const result = sync.data?.results?.[source]

  return (
    <Card>
      <CardContent className="p-[20px_22px] flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[14.5px] font-semibold">{label} access needed</h2>
          <p className="m-0 text-[13px] leading-[1.55] text-ink-muted max-w-[64ch]">{helpText}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
              {source === 'ads' ? 'Ad account ID' : `${label} ID`}
            </span>
            <input
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder={placeholder}
              className="text-[13px] rounded-[8px] border border-border px-3 py-2 font-mono bg-surface"
            />
          </div>
          <Button
            variant="secondary"
            disabled={!property.trim() || setConnection.isPending}
            onClick={() => setConnection.mutate({ source, property: property.trim() })}
          >
            {setConnection.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button disabled={!info.property || sync.isPending} onClick={() => sync.mutate()}>
            {sync.isPending ? 'Checking…' : 'Check access'}
          </Button>
        </div>
        {result && (
          <p className={`m-0 text-[12px] ${result.status === 'granted' ? 'text-signal-green' : 'text-signal-red'}`}>
            {result.status === 'granted'
              ? 'Access confirmed — data will appear after the next sync.'
              : (result.error ?? 'Still no access.')}
          </p>
        )}
        {sync.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {sync.error instanceof Error ? sync.error.message : 'Sync failed'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function PostsCard({ posts }: { posts: PostRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top posts</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {posts.length === 0 ? (
          <p className="m-0 p-[16px_18px] text-[13px] text-ink-muted">No post data yet.</p>
        ) : (
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Reach</TableHead>
                <TableHead>Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.postId}>
                  <TableCell className="max-w-[320px] truncate">
                    {p.permalink ? (
                      <a href={p.permalink} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {p.caption || p.permalink}
                      </a>
                    ) : (
                      p.caption ?? p.postId
                    )}
                  </TableCell>
                  <TableCell className="text-[12px] text-ink-muted capitalize">
                    {p.platform === 'facebook_page' ? 'Facebook' : 'Instagram'}
                  </TableCell>
                  <TableCell className="font-mono text-[12px]">{p.reach.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-[12px] text-ink-muted">{p.engagement.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function CampaignsCard({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns (28d)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {campaigns.length === 0 ? (
          <p className="m-0 p-[16px_18px] text-[13px] text-ink-muted">No campaign data yet.</p>
        ) : (
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Cost / lead</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.campaignId}>
                  <TableCell className="max-w-[260px] truncate">{c.campaignName}</TableCell>
                  <TableCell className="font-mono text-[12px]">{formatCents(c.spendCents)}</TableCell>
                  <TableCell className="font-mono text-[12px] text-ink-muted">{c.clicks.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-[12px] text-ink-muted">{c.leads}</TableCell>
                  <TableCell className="font-mono text-[12px] text-ink-muted">
                    {c.leads > 0 ? formatCents(c.spendCents / c.leads) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function SocialPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc } = useAccount(accountId)
  const { data, isLoading, isError, error, refetch, isFetching } = useMetaPerformance(accountId)
  const sync = useSyncMetaPerformance(accountId!)

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle className="flex items-center gap-2">
          <AlertTriangle size={14} /> Couldn't load social performance
        </AlertTitle>
        <AlertDescription>{error instanceof Error ? error.message : 'Unknown error'}</AlertDescription>
        <div>
          <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Retrying…' : 'Retry'}
          </Button>
        </div>
      </Alert>
    )
  }

  const last28 = (data?.organicDaily ?? []).slice(-28)
  const fbReach = windowTotal(last28.map((d) => d.fbReach))
  const fbEngagement = windowTotal(last28.map((d) => d.fbEngagement))
  const igReach = windowTotal(last28.map((d) => d.igReach))
  const igEngagement = windowTotal(last28.map((d) => d.igEngagement))
  const organicGranted = data?.facebookPage.status === 'granted' || data?.instagram.status === 'granted'
  const adsGranted = data?.ads.status === 'granted'
  const costPerLead = data && data.adTotals.leads > 0 ? data.adTotals.spendCents / data.adTotals.leads : null

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(accountId ? `/clients/${accountId}` : '/clients')}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> {acc?.name ?? 'Account'}
      </button>

      <div className="flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
            {acc?.website ?? '—'} · Social &amp; Ads
          </span>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Social &amp; Ads</h1>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <ConnectionPill label="Facebook" info={data.facebookPage} />
            <ConnectionPill label="Instagram" info={data.instagram} />
            <ConnectionPill label="Ads" info={data.ads} />
            <Button
              variant="secondary"
              disabled={sync.isPending || (!data.facebookPage.property && !data.instagram.property && !data.ads.property)}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-[220px] w-full" />
        </div>
      )}

      {!isLoading && data && (
        <>
          {organicGranted ? (
            <div className="flex flex-col gap-4">
              <section
                className="grid gap-[10px]"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
              >
                <StatTile label="Facebook reach (28d)" value={fbReach.toLocaleString()} />
                <StatTile label="Facebook engagement" value={fbEngagement.toLocaleString()} />
                <StatTile label="Facebook followers" value={data.fbFollowers?.toLocaleString() ?? '—'} />
                <StatTile label="Instagram reach (28d)" value={igReach.toLocaleString()} />
                <StatTile label="Instagram engagement" value={igEngagement.toLocaleString()} />
                <StatTile label="Instagram followers" value={data.igFollowers?.toLocaleString() ?? '—'} />
              </section>
              <PostsCard posts={data.posts} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ConnectionSetupCard
                accountId={accountId!}
                source="facebook_page"
                label="Facebook"
                info={data.facebookPage}
                placeholder="Page ID"
                helpText="Add the sync System User as an admin of this Page's Business Manager assets (Business Settings → Pages), enter the Page ID, then check access."
              />
              <ConnectionSetupCard
                accountId={accountId!}
                source="instagram"
                label="Instagram"
                info={data.instagram}
                placeholder="IG business account ID"
                helpText="Connect the client's Instagram professional account to its linked Facebook Page, enter the IG business account ID, then check access."
              />
            </div>
          )}

          {adsGranted ? (
            <div className="flex flex-col gap-4">
              <section
                className="grid gap-[10px]"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
              >
                <StatTile label="Ad spend (28d)" value={formatCents(data.adTotals.spendCents)} />
                <StatTile label="Impressions" value={data.adTotals.impressions.toLocaleString()} />
                <StatTile label="Clicks" value={data.adTotals.clicks.toLocaleString()} />
                <StatTile label="Leads" value={String(data.adTotals.leads)} />
                <StatTile label="Cost / lead" value={costPerLead != null ? formatCents(costPerLead) : '—'} />
                <StatTile
                  label="GA4 conversions (28d)"
                  value={data.ga4Conversions28d != null ? data.ga4Conversions28d.toLocaleString() : '—'}
                  note="reconciliation, not attribution"
                />
              </section>
              <CampaignsCard campaigns={data.campaigns} />
            </div>
          ) : (
            <ConnectionSetupCard
              accountId={accountId!}
              source="ads"
              label="Ads"
              info={data.ads}
              placeholder="Ad account ID (with or without act_)"
              helpText="Add the sync System User with reporting access to this ad account (Business Settings → Ad accounts), enter the ad account ID, then check access."
            />
          )}
        </>
      )}
    </div>
  )
}
