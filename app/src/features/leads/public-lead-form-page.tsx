import * as React from 'react'

import { useAgencySettings } from '@/features/settings/use-agency-settings'
import { useSubmitLead, type LeadFormInput } from '@/features/leads/use-submit-lead'

const EMPTY_FORM: LeadFormInput = {
  name: '',
  email: '',
  phone: '',
  company: '',
  message: '',
  website_url: '',
}

export function PublicLeadFormPage() {
  const { data: settings } = useAgencySettings()
  const submit = useSubmitLead()
  const [form, setForm] = React.useState<LeadFormInput>(EMPTY_FORM)

  const agencyName = settings?.agencyName ?? 'SEO CRM'
  const brandColor = settings?.primaryColor ?? '#1f5c46'

  const set = (key: keyof LeadFormInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  if (submit.isSuccess) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-6">
        <div className="max-w-[440px] w-full bg-surface border border-border rounded-[14px] p-[32px] text-center flex flex-col gap-2">
          <h1 className="m-0 text-[20px] font-semibold" style={{ color: brandColor }}>
            Thanks — we've got it
          </h1>
          <p className="m-0 text-[14px] text-ink-muted">
            {agencyName} will be in touch shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6">
      <div className="max-w-[440px] w-full bg-surface border border-border rounded-[14px] p-[32px] flex flex-col gap-4">
        <div className="flex items-center gap-[10px]">
          {settings?.logoUrl && <img src={settings.logoUrl} alt={agencyName} className="h-[28px] w-auto" />}
          <h1 className="m-0 text-[19px] font-semibold">Talk to {agencyName}</h1>
        </div>
        <p className="m-0 text-[13.5px] text-ink-muted">
          Tell us a bit about your project and we'll follow up.
        </p>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit.mutate(form)
          }}
        >
          <input
            value={form.name}
            onChange={set('name')}
            placeholder="Your name *"
            required
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full"
          />
          <input
            value={form.email}
            onChange={set('email')}
            type="email"
            placeholder="Email *"
            required
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full"
          />
          <input
            value={form.phone}
            onChange={set('phone')}
            placeholder="Phone"
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full"
          />
          <input
            value={form.company}
            onChange={set('company')}
            placeholder="Company"
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full"
          />
          <textarea
            value={form.message}
            onChange={set('message')}
            placeholder="What are you looking for help with?"
            rows={4}
            className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full resize-none"
          />

          {/* Honeypot — hidden from real visitors via CSS, not `type="hidden"` (bots that only skip hidden inputs still fill this) */}
          <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
            <label>
              Website
              <input value={form.website_url} onChange={set('website_url')} tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {submit.isError && (
            <p className="m-0 text-[12.5px] text-signal-red">
              {submit.error instanceof Error ? submit.error.message : 'Something went wrong — try again.'}
            </p>
          )}

          <button
            type="submit"
            disabled={!form.name.trim() || !form.email.trim() || submit.isPending}
            className="text-[14px] font-semibold text-white rounded-[8px] px-4 py-[10px] border-none cursor-pointer disabled:opacity-60"
            style={{ background: brandColor }}
          >
            {submit.isPending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
