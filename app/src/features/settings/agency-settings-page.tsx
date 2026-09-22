import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAgencySettings,
  useUpdateAgencySettings,
  type AgencySettings,
} from '@/features/settings/use-agency-settings'

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

export function AgencySettingsPage() {
  const { data: settings, isLoading } = useAgencySettings()

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
    </div>
  )
}
