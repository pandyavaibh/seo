import * as React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useRunTechnicalAudit, useTechnicalAudits, type TechnicalAuditRow } from '@/features/accounts/use-technical-audit'

function scoreTone(score: number | null): 'green' | 'amber' | 'red' | 'neutral' {
  if (score == null) return 'neutral'
  if (score >= 90) return 'green'
  if (score >= 50) return 'amber'
  return 'red'
}

function ScoreTile({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="bg-surface-sunken border border-border-light rounded-[10px] p-[10px_12px] flex flex-col gap-[3px] flex-1 min-w-[100px]">
      <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase text-ink-muted">{label}</span>
      <span className="text-[18px] font-semibold tracking-[-0.02em] leading-none">
        <Badge tone={scoreTone(score)} className="text-[14px] px-[8px] py-[2px]">
          {score ?? '—'}
        </Badge>
      </span>
    </div>
  )
}

function LatestAuditSummary({ audit }: { audit: TechnicalAuditRow }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-[10px]">
        <ScoreTile label="Performance" score={audit.performanceScore} />
        <ScoreTile label="SEO" score={audit.seoScore} />
        <ScoreTile label="Accessibility" score={audit.accessibilityScore} />
        <ScoreTile label="Best practices" score={audit.bestPracticesScore} />
      </div>
      <div className="flex flex-wrap gap-[16px] font-mono text-[12px] text-ink-secondary">
        <span>LCP {audit.lcpMs != null ? `${(audit.lcpMs / 1000).toFixed(1)}s` : '—'}</span>
        <span>CLS {audit.cls != null ? audit.cls.toFixed(3) : '—'}</span>
        <span>INP {audit.inpMs != null ? `${audit.inpMs}ms` : '—'}</span>
        <span>
          robots.txt {audit.hasRobotsTxt ? <Badge tone="green">found</Badge> : <Badge tone="red">missing</Badge>}
        </span>
        <span>
          sitemap.xml {audit.hasSitemap ? <Badge tone="green">found</Badge> : <Badge tone="red">missing</Badge>}
        </span>
      </div>
      {audit.error && (
        <p className="m-0 text-[12px] text-signal-red">Lighthouse run failed: {audit.error}</p>
      )}
      <p className="m-0 font-mono text-[10.5px] text-ink-faint">
        {audit.url} · {new Date(audit.runAt).toLocaleString()}
      </p>
    </div>
  )
}

export function TechnicalAuditCard({ accountId, website }: { accountId: string; website: string | null }) {
  const { data: audits, isLoading } = useTechnicalAudits(accountId)
  const runAudit = useRunTechnicalAudit(accountId)
  const [url, setUrl] = React.useState(website ?? '')

  const latest = audits?.[0]
  const history = audits?.slice(1) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical audit</CardTitle>
        <span className="font-mono text-[11px] text-ink-muted">
          Free — Google PageSpeed Insights + robots.txt/sitemap.xml check
        </span>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com"
            className="flex-1 min-w-[180px] text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface"
          />
          <Button
            size="sm"
            disabled={!url.trim() || runAudit.isPending}
            onClick={() => runAudit.mutate(url)}
          >
            {runAudit.isPending ? 'Running… (can take ~30s)' : 'Run audit'}
          </Button>
        </div>
        {runAudit.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {runAudit.error instanceof Error ? runAudit.error.message : 'Audit failed'}
          </p>
        )}

        {isLoading && <Skeleton className="h-[100px] w-full" />}

        {!isLoading && !latest && (
          <p className="m-0 text-[13px] text-ink-muted">No audits run yet.</p>
        )}

        {!isLoading && latest && <LatestAuditSummary audit={latest} />}

        {history.length > 0 && (
          <details className="text-[12.5px]">
            <summary className="cursor-pointer text-ink-muted">Past runs ({history.length})</summary>
            <div className="flex flex-col gap-2 mt-2">
              {history.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 py-[6px] border-t border-border-light">
                  <span className="font-mono text-[11px] text-ink-muted">{new Date(a.runAt).toLocaleString()}</span>
                  <span className="flex items-center gap-[6px]">
                    <Badge tone={scoreTone(a.performanceScore)}>{a.performanceScore ?? '—'}</Badge>
                    <Badge tone={scoreTone(a.seoScore)}>{a.seoScore ?? '—'}</Badge>
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
