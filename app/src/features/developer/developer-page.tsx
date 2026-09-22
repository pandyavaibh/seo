import * as React from 'react'

import { Badge } from '@/components/ui/badge'
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
import {
  useApiKeys,
  useCreateApiKey,
  useCreateWebhook,
  useDeleteWebhook,
  useRevokeApiKey,
  useToggleWebhook,
  useWebhooks,
} from '@/features/developer/use-developer'
import type { WebhookEventType } from '@/lib/database.types'

const EVENT_TYPES: WebhookEventType[] = ['report.sent', 'invoice.paid', 'deal.won']

function RevealOnce({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <div className="flex flex-col gap-1 p-[10px_12px] rounded-[8px] bg-surface-sunken border border-border-light">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-signal-amber">
        {label} — shown once, copy it now
      </span>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 text-[12px] break-all">{value}</code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

function ApiKeysCard() {
  const { data: keys, isLoading } = useApiKeys()
  const { data: accounts } = useAccounts()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const [showForm, setShowForm] = React.useState(false)
  const [accountId, setAccountId] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null)

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>API keys</CardTitle>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            New key
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <p className="m-0 text-[12px] text-ink-muted">
          Bearer token for <code>GET /accounts/:id/summary</code> on the public-api Edge
          Function. Account-scoped keys only read that account; leave "Client" blank for an
          org-wide key.
        </p>
        {revealedKey && <RevealOnce value={revealedKey} label="New API key" />}
        {showForm && (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={fieldClass}>
                <option value="">Org-wide (all accounts)</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Partner dashboard" className={fieldClass} />
            </div>
            {createKey.isError && (
              <p className="m-0 text-[12px] text-signal-red">
                {createKey.error instanceof Error ? createKey.error.message : 'Failed to create key'}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!label.trim() || createKey.isPending}
                onClick={() =>
                  createKey.mutate(
                    { accountId: accountId || null, label },
                    {
                      onSuccess: (raw) => {
                        setRevealedKey(raw)
                        setLabel('')
                        setAccountId('')
                        setShowForm(false)
                      },
                    },
                  )
                }
              >
                {createKey.isPending ? 'Creating…' : 'Create key'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading && <p className="m-0 text-[13px] text-ink-muted">Loading…</p>}
        {!isLoading && (keys ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No API keys yet.</p>
        )}
        {!isLoading && (keys ?? []).length > 0 && (
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Key</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(keys ?? []).map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="text-[13px]">{k.label}</TableCell>
                  <TableCell className="text-[12.5px] text-ink-muted">{k.accountName ?? 'Org-wide'}</TableCell>
                  <TableCell className="font-mono text-[11.5px] text-ink-muted">{k.keyPrefix}…</TableCell>
                  <TableCell>
                    {k.revokedAt ? (
                      <Badge tone="neutral">Revoked</Badge>
                    ) : (
                      <button
                        onClick={() => revokeKey.mutate(k.id)}
                        disabled={revokeKey.isPending}
                        className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
                      >
                        Revoke
                      </button>
                    )}
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

function WebhooksCard() {
  const { data: webhooks, isLoading } = useWebhooks()
  const { data: accounts } = useAccounts()
  const createWebhook = useCreateWebhook()
  const toggleWebhook = useToggleWebhook()
  const deleteWebhook = useDeleteWebhook()
  const [showForm, setShowForm] = React.useState(false)
  const [accountId, setAccountId] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [eventType, setEventType] = React.useState<WebhookEventType>('report.sent')
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
            New subscription
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <p className="m-0 text-[12px] text-ink-muted">
          Fires a POST with a JSON payload and an <code>x-webhook-secret</code> header when the
          event happens. Leave "Client" blank to fire for every account.
        </p>
        {revealedSecret && <RevealOnce value={revealedSecret} label="Webhook secret" />}
        {showForm && (
          <div className="flex flex-col gap-2">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={fieldClass}>
                <option value="">All accounts</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select value={eventType} onChange={(e) => setEventType(e.target.value as WebhookEventType)} className={fieldClass}>
                {EVENT_TYPES.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" className={fieldClass} />
            </div>
            {createWebhook.isError && (
              <p className="m-0 text-[12px] text-signal-red">
                {createWebhook.error instanceof Error ? createWebhook.error.message : 'Failed to create subscription'}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!url.trim() || createWebhook.isPending}
                onClick={() =>
                  createWebhook.mutate(
                    { accountId: accountId || null, url, eventType },
                    {
                      onSuccess: (secret) => {
                        setRevealedSecret(secret)
                        setUrl('')
                        setAccountId('')
                        setShowForm(false)
                      },
                    },
                  )
                }
              >
                {createWebhook.isPending ? 'Creating…' : 'Create subscription'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {isLoading && <p className="m-0 text-[13px] text-ink-muted">Loading…</p>}
        {!isLoading && (webhooks ?? []).length === 0 && (
          <p className="m-0 text-[13px] text-ink-muted">No webhook subscriptions yet.</p>
        )}
        {!isLoading && (webhooks ?? []).length > 0 && (
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(webhooks ?? []).map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-[11.5px]">{w.eventType}</TableCell>
                  <TableCell className="text-[12.5px] text-ink-muted">{w.accountName ?? 'All accounts'}</TableCell>
                  <TableCell className="max-w-[220px] truncate font-mono text-[11.5px]">{w.url}</TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={w.active}
                      onChange={(e) => toggleWebhook.mutate({ id: w.id, active: e.target.checked })}
                      disabled={toggleWebhook.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => deleteWebhook.mutate(w.id)}
                      disabled={deleteWebhook.isPending}
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
  )
}

export function DeveloperPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Admin</span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Developer</h1>
        <p className="m-0 text-[13px] text-ink-muted max-w-[64ch]">
          A public read-only API and outbound webhooks — both free (this app's own data behind
          an Edge Function, and outgoing HTTP calls, not a paid API gateway). See
          docs/STAGE_8.md for the exact scope and what's deliberately not exposed.
        </p>
      </div>
      <ApiKeysCard />
      <WebhooksCard />
    </div>
  )
}
