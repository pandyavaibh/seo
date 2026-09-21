import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAccounts } from '@/features/accounts/use-accounts'
import { useCurrentMember } from '@/features/team/use-current-member'
import { useCreateUtmLink, useDeleteUtmLink, useUtmLinks } from '@/features/social/use-utm-links'

// Enforced naming: lowercase, spaces become hyphens — the same string
// always builds the same UTM value, so GA4 channel attribution doesn't
// fracture into "Newsletter" / "newsletter" / "news letter" variants.
function slug(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

function buildUrl(baseUrl: string, source: string, medium: string, campaign: string, term: string, content: string) {
  if (!baseUrl.trim()) return ''
  try {
    const url = new URL(baseUrl.trim())
    if (source) url.searchParams.set('utm_source', slug(source))
    if (medium) url.searchParams.set('utm_medium', slug(medium))
    if (campaign) url.searchParams.set('utm_campaign', slug(campaign))
    if (term) url.searchParams.set('utm_term', slug(term))
    if (content) url.searchParams.set('utm_content', slug(content))
    return url.toString()
  } catch {
    return ''
  }
}

export function UtmBuilderPage() {
  const { data: accounts } = useAccounts()
  const { data: currentMember } = useCurrentMember()
  const { data: links, isLoading } = useUtmLinks()
  const createLink = useCreateUtmLink()
  const deleteLink = useDeleteUtmLink()

  const [accountId, setAccountId] = React.useState('')
  const [baseUrl, setBaseUrl] = React.useState('')
  const [source, setSource] = React.useState('')
  const [medium, setMedium] = React.useState('')
  const [campaign, setCampaign] = React.useState('')
  const [term, setTerm] = React.useState('')
  const [content, setContent] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  const builtUrl = buildUrl(baseUrl, source, medium, campaign, term, content)
  const canBuild = baseUrl.trim() !== '' && source.trim() !== '' && medium.trim() !== '' && campaign.trim() !== '' && builtUrl !== ''

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full font-mono'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Tools</span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">UTM builder</h1>
        <p className="m-0 text-[13px] text-ink-muted max-w-[64ch]">
          Enforced naming (lowercase, hyphenated) keeps GA4 channel attribution clean — see
          docs/STAGE_6.md for why this is a naming convention here, not a validation call to GA4.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Build a link</CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px] flex flex-col gap-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Client (optional)</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={fieldClass}>
                <option value="">—</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 flex-[2_1_320px]">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Destination URL *</span>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://client.com/landing-page" className={fieldClass} />
            </label>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Source *</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="facebook" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Medium *</span>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="paid-social" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Campaign *</span>
              <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring-promo" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Term</span>
              <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="optional" className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Content</span>
              <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="optional" className={fieldClass} />
            </label>
          </div>

          {builtUrl && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Built URL</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 text-[12px] break-all p-[8px_10px] bg-surface-sunken rounded-[8px] border border-border-light">
                  {builtUrl}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(builtUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          {createLink.isError && (
            <p className="m-0 text-[12px] text-signal-red">
              {createLink.error instanceof Error ? createLink.error.message : 'Failed to save link'}
            </p>
          )}

          <div>
            <Button
              disabled={!canBuild || createLink.isPending}
              onClick={() =>
                createLink.mutate(
                  {
                    accountId: accountId || null,
                    baseUrl: baseUrl.trim(),
                    source: slug(source),
                    medium: slug(medium),
                    campaign: slug(campaign),
                    term,
                    content,
                    builtUrl,
                    createdBy: currentMember?.id ?? null,
                  },
                  {
                    onSuccess: () => {
                      setBaseUrl('')
                      setSource('')
                      setMedium('')
                      setCampaign('')
                      setTerm('')
                      setContent('')
                    },
                  },
                )
              }
            >
              {createLink.isPending ? 'Saving…' : 'Save to history'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading && <p className="m-0 p-[18px] text-[13px] text-ink-muted">Loading…</p>}
          {!isLoading && (links ?? []).length === 0 && (
            <p className="m-0 p-[18px] text-[13px] text-ink-muted">No saved links yet.</p>
          )}
          {!isLoading && (links ?? []).length > 0 && (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Source / medium / campaign</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(links ?? []).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-[12.5px] text-ink-muted">{l.accountName ?? '—'}</TableCell>
                    <TableCell className="font-mono text-[11.5px]">
                      {l.source} / {l.medium} / {l.campaign}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate font-mono text-[11.5px]">
                      <a href={l.builtUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        {l.builtUrl}
                      </a>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => deleteLink.mutate(l.id)}
                        disabled={deleteLink.isPending}
                        className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
                      >
                        Remove
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
