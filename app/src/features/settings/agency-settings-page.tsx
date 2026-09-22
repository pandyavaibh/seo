import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberRates, useSetMemberRate } from '@/features/billing/use-billing'
import {
  useAgencySettings,
  useUpdateAgencySettings,
  type AgencySettings,
} from '@/features/settings/use-agency-settings'
import { useCurrentMember } from '@/features/team/use-current-member'

function BrandingForm({ settings }: { settings: AgencySettings }) {
  const update = useUpdateAgencySettings()
  const [agencyName, setAgencyName] = React.useState(settings.agencyName)
  const [logoUrl, setLogoUrl] = React.useState(settings.logoUrl ?? '')
  const [primaryColor, setPrimaryColor] = React.useState(settings.primaryColor)

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
          Agency name
        </span>
        <input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
          Logo URL
        </span>
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">
          Primary color
        </span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="w-[44px] h-[36px] rounded-[6px] border border-border bg-surface cursor-pointer"
          />
          <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={fieldClass} />
        </div>
      </label>

      {logoUrl && (
        <div className="flex items-center gap-2 p-[10px_12px] rounded-[8px] bg-surface-sunken border border-border-light">
          <img src={logoUrl} alt="Logo preview" className="h-[28px] w-auto" />
          <span className="text-[12px] text-ink-muted">Preview</span>
        </div>
      )}

      {update.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {update.error instanceof Error ? update.error.message : 'Failed to save'}
        </p>
      )}

      <Button
        disabled={!agencyName.trim() || update.isPending}
        onClick={() => update.mutate({ id: settings.id, agencyName, logoUrl, primaryColor })}
        className="self-start"
      >
        {update.isPending ? 'Saving…' : 'Save'}
      </Button>
    </>
  )
}

function CostRatesCard() {
  const { data: rates, isLoading } = useMemberRates()
  const setRate = useSetMemberRate()
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost rates (admin only)</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-2">
        <p className="m-0 text-[12px] text-ink-muted max-w-[62ch]">
          Hourly cost rate per person, used only for the profitability calculation on each
          client's Billing page — never shown to managers or the client portal.
        </p>
        {isLoading && <Skeleton className="h-[120px] w-full" />}
        {!isLoading && (rates ?? []).map((r) => (
          <div key={r.memberId} className="flex items-center gap-2">
            <span className="text-[13px] flex-1 min-w-0">{r.name}</span>
            <input
              value={drafts[r.memberId] ?? (r.costRateCents != null ? String(r.costRateCents / 100) : '')}
              onChange={(e) => setDrafts({ ...drafts, [r.memberId]: e.target.value })}
              placeholder="$/hr"
              inputMode="decimal"
              className="w-[80px] text-[12px] font-mono border border-border rounded-[6px] px-2 py-1"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!drafts[r.memberId]?.trim() || setRate.isPending}
              onClick={() =>
                setRate.mutate(
                  { memberId: r.memberId, costRateCents: Math.round(Number(drafts[r.memberId]) * 100) },
                  { onSuccess: () => setDrafts({ ...drafts, [r.memberId]: '' }) },
                )
              }
            >
              Save
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AgencySettingsPage() {
  const { data: settings, isLoading } = useAgencySettings()
  const { data: currentMember } = useCurrentMember()

  return (
    <div className="flex flex-col gap-[18px] max-w-[560px]">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          White-label branding
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Agency settings</h1>
        <p className="m-0 text-[13px] text-ink-muted">
          Applied to the client portal and PDF reports — what your clients see, not the internal
          staff tool.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px] flex flex-col gap-3">
          {isLoading && <Skeleton className="h-[160px] w-full" />}
          {!isLoading && settings && <BrandingForm key={settings.id} settings={settings} />}
        </CardContent>
      </Card>

      {currentMember?.role === 'admin' && <CostRatesCard />}
    </div>
  )
}
