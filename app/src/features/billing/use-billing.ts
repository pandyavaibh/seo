import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { InvoiceKind, InvoiceStatus, ExpenseCategory } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export interface InvoiceLineItem {
  id: string
  description: string
  amountCents: number
}

export interface InvoiceRow {
  id: string
  kind: InvoiceKind
  periodStart: string | null
  periodEnd: string | null
  amountCents: number
  status: InvoiceStatus
  issuedOn: string | null
  dueOn: string | null
  paidOn: string | null
  notes: string | null
  lineItems: InvoiceLineItem[]
}

export function useInvoices(accountId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', accountId],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select(
          'id, kind, period_start, period_end, amount_cents, status, issued_on, due_on, paid_on, notes, invoice_line_items(id, description, amount_cents)',
        )
        .eq('account_id', accountId!)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((i) => ({
        id: i.id,
        kind: i.kind,
        periodStart: i.period_start,
        periodEnd: i.period_end,
        amountCents: i.amount_cents,
        status: i.status,
        issuedOn: i.issued_on,
        dueOn: i.due_on,
        paidOn: i.paid_on,
        notes: i.notes,
        lineItems: (i.invoice_line_items ?? []).map((l) => ({
          id: l.id,
          description: l.description,
          amountCents: l.amount_cents,
        })),
      }))
    },
    enabled: !!accountId,
  })
}

export interface NewInvoiceInput {
  kind: InvoiceKind
  periodStart: string
  periodEnd: string
  dueOn: string
  lineItems: { description: string; amountDollars: string }[]
}

export function useCreateInvoice(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInvoiceInput) => {
      const lineItems = input.lineItems.filter((l) => l.description.trim() && l.amountDollars.trim())
      const amountCents = lineItems.reduce((s, l) => s + Math.round(Number(l.amountDollars) * 100), 0)
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          account_id: accountId,
          kind: input.kind,
          period_start: input.periodStart || null,
          period_end: input.periodEnd || null,
          due_on: input.dueOn || null,
          amount_cents: amountCents,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      if (lineItems.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_line_items').insert(
          lineItems.map((l) => ({
            invoice_id: invoice.id,
            description: l.description.trim(),
            amount_cents: Math.round(Number(l.amountDollars) * 100),
          })),
        )
        if (itemsError) throw new Error(itemsError.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', accountId] })
    },
  })
}

export function useUpdateInvoiceStatus(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; status: InvoiceStatus }) => {
      const patch: { status: InvoiceStatus; issued_on?: string; paid_on?: string } = { status: input.status }
      const today = new Date().toISOString().slice(0, 10)
      if (input.status === 'sent') patch.issued_on = today
      if (input.status === 'paid') patch.paid_on = today
      const { error } = await supabase.from('invoices').update(patch).eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', accountId] })
    },
  })
}

export function useDeleteInvoice(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', accountId] })
    },
  })
}

export interface ExpenseRow {
  id: string
  category: ExpenseCategory
  description: string
  amountCents: number
  incurredOn: string
}

export function useExpenses(accountId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', accountId],
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, category, description, amount_cents, incurred_on')
        .eq('account_id', accountId!)
        .order('incurred_on', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amountCents: e.amount_cents,
        incurredOn: e.incurred_on,
      }))
    },
    enabled: !!accountId,
  })
}

export function useAddExpense(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { category: ExpenseCategory; description: string; amountDollars: string; incurredOn: string }) => {
      const { error } = await supabase.from('expenses').insert({
        account_id: accountId,
        category: input.category,
        description: input.description.trim(),
        amount_cents: Math.round(Number(input.amountDollars) * 100),
        incurred_on: input.incurredOn,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', accountId] })
    },
  })
}

export function useDeleteExpense(accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', accountId] })
    },
  })
}

// ---------------------------------------------------------------------
// Profitability (admin-only — member_rates itself is RLS-locked to
// admin, so a manager calling this just gets empty rates and an
// honestly incomplete number, never a silently wrong one).
// ---------------------------------------------------------------------

export interface ProfitabilityData {
  retainerCents: number | null
  laborCostCents: number
  expensesCents: number
  linkCostsCents: number
  profitCents: number | null
  hoursLogged: number
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(start), end: iso(end) }
}

export interface MemberRateRow {
  memberId: string
  name: string
  costRateCents: number | null
}

export function useMemberRates() {
  return useQuery({
    queryKey: ['member-rates'],
    queryFn: async (): Promise<MemberRateRow[]> => {
      const [membersRes, ratesRes] = await Promise.all([
        supabase.from('team_members').select('id, name').eq('active', true).order('name'),
        supabase.from('member_rates').select('member_id, cost_rate_cents'),
      ])
      if (membersRes.error) throw new Error(membersRes.error.message)
      if (ratesRes.error) throw new Error(ratesRes.error.message)
      const rateByMember = new Map((ratesRes.data ?? []).map((r) => [r.member_id, r.cost_rate_cents]))
      return (membersRes.data ?? []).map((m) => ({
        memberId: m.id,
        name: m.name,
        costRateCents: rateByMember.get(m.id) ?? null,
      }))
    },
  })
}

export function useSetMemberRate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { memberId: string; costRateCents: number }) => {
      const { error } = await supabase
        .from('member_rates')
        .upsert(
          { member_id: input.memberId, cost_rate_cents: input.costRateCents, updated_at: new Date().toISOString() },
          { onConflict: 'member_id' },
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-rates'] })
    },
  })
}

export function useProfitability(accountId: string | undefined) {
  return useQuery({
    queryKey: ['profitability', accountId],
    queryFn: async (): Promise<ProfitabilityData> => {
      const { start, end } = currentMonthRange()
      const [accountRes, projectsRes, expensesRes] = await Promise.all([
        supabase.from('accounts').select('retainer_cents').eq('id', accountId!).single(),
        supabase.from('projects').select('id').eq('account_id', accountId!),
        supabase
          .from('expenses')
          .select('amount_cents, category')
          .eq('account_id', accountId!)
          .gte('incurred_on', start)
          .lte('incurred_on', end),
      ])
      if (accountRes.error) throw new Error(accountRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)
      if (expensesRes.error) throw new Error(expensesRes.error.message)

      const projectIds = (projectsRes.data ?? []).map((p) => p.id)

      let laborCostCents = 0
      let hoursLogged = 0

      if (projectIds.length > 0) {
        const [entriesRes, ratesRes] = await Promise.all([
          supabase
            .from('time_entries')
            .select('member_id, hours')
            .in('project_id', projectIds)
            .gte('worked_on', start)
            .lte('worked_on', end),
          supabase.from('member_rates').select('member_id, cost_rate_cents'),
        ])
        if (entriesRes.error) throw new Error(entriesRes.error.message)
        if (ratesRes.error) throw new Error(ratesRes.error.message)

        const rateByMember = new Map((ratesRes.data ?? []).map((r) => [r.member_id, r.cost_rate_cents]))
        for (const e of entriesRes.data ?? []) {
          hoursLogged += Number(e.hours)
          const rate = rateByMember.get(e.member_id)
          if (rate != null) laborCostCents += Number(e.hours) * rate
        }
      }

      // Backlink costs are just an expense category now (no more per-link
      // cost_cents field on a dedicated table) — a breakdown of
      // expensesCents, not a separate pool, so it isn't subtracted twice.
      const linkCostsCents = (expensesRes.data ?? [])
        .filter((e) => e.category === 'link_cost')
        .reduce((s, e) => s + e.amount_cents, 0)
      const expensesCents = (expensesRes.data ?? []).reduce((s, e) => s + e.amount_cents, 0)
      const retainerCents = accountRes.data?.retainer_cents ?? null

      return {
        retainerCents,
        laborCostCents,
        expensesCents,
        linkCostsCents,
        profitCents: retainerCents != null ? retainerCents - laborCostCents - expensesCents : null,
        hoursLogged,
      }
    },
    enabled: !!accountId,
  })
}
