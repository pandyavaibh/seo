import { useQuery } from '@tanstack/react-query'

import { currentMonthKey } from '@/features/checklist/use-checklist'
import type { AccountHealth } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------
// Dashboard — the staff landing page. Three independent sections, each
// scoped to what the viewing role can legitimately see rather than one
// query widened to fit all three:
//
// - Agency overview reads through list_accounts_directory() (the same
//   non-financial, any-staff-readable function the Clients page uses),
//   so client counts/health/renewals work for every role.
// - My work today is filtered to the caller's own member_id throughout
//   (assignments, time_entries, checklist_runs), which RLS already
//   scopes to "projects I'm on" — so it's naturally safe for any role
//   with no extra gating needed.
// - Business overview reads straight from `accounts.retainer_cents` and
//   `member_rates`, both admin/manager-only under existing RLS — same
//   financial-visibility boundary Billing and the Account page already
//   draw. The caller must gate its `enabled` flag to admin/manager;
//   RLS returns an empty result rather than crashing if that slips.
// ---------------------------------------------------------------------

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: isoDate(start), end: isoDate(end) }
}

function startOfWeekIso() {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  return isoDate(monday)
}

// ---------------------------------------------------------------------
// Agency-wide overview
// ---------------------------------------------------------------------

export interface UpcomingRenewal {
  accountId: string
  name: string
  renewalOn: string
  daysUntil: number
}

export interface AgencyOverview {
  totalClients: number
  healthy: number
  watch: number
  atRisk: number
  upcomingRenewals: UpcomingRenewal[]
}

export function useAgencyOverview() {
  return useQuery({
    queryKey: ['dashboard', 'agency-overview'],
    queryFn: async (): Promise<AgencyOverview> => {
      const { data, error } = await supabase.rpc('list_accounts_directory')
      if (error) throw new Error(error.message)
      const rows = data ?? []

      const today = new Date()
      const cutoff = new Date(today.getTime() + 60 * 86400000)
      const upcomingRenewals: UpcomingRenewal[] = rows
        .filter((a) => a.renewal_on && new Date(a.renewal_on) >= today && new Date(a.renewal_on) <= cutoff)
        .map((a) => ({
          accountId: a.id,
          name: a.name,
          renewalOn: a.renewal_on as string,
          daysUntil: Math.round((new Date(a.renewal_on as string).getTime() - today.getTime()) / 86400000),
        }))
        .sort((x, y) => x.daysUntil - y.daysUntil)

      return {
        totalClients: rows.length,
        healthy: rows.filter((a) => a.health === 'healthy').length,
        watch: rows.filter((a) => a.health === 'watch').length,
        atRisk: rows.filter((a) => a.health === 'at_risk').length,
        upcomingRenewals,
      }
    },
  })
}

// ---------------------------------------------------------------------
// My work today
// ---------------------------------------------------------------------

export interface MyProject {
  id: string
  name: string
  accountId: string | null
  accountName: string | null
  pendingChecklist: number
  totalChecklist: number
}

export interface MyWorkToday {
  projects: MyProject[]
  hoursThisWeek: number
}

export function useMyWorkToday(memberId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'my-work', memberId],
    queryFn: async (): Promise<MyWorkToday> => {
      const month = currentMonthKey()
      const weekStart = startOfWeekIso()
      const today = isoDate(new Date())

      const [assignmentsRes, directoryRes, hoursRes, totalItemsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('projects(id, name, account_id)')
          .eq('member_id', memberId!),
        supabase.rpc('list_accounts_directory'),
        supabase
          .from('time_entries')
          .select('hours')
          .eq('member_id', memberId!)
          .gte('worked_on', weekStart)
          .lte('worked_on', today),
        supabase.from('checklist_template_items').select('id', { count: 'exact', head: true }).eq('active', true),
      ])
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      if (directoryRes.error) throw new Error(directoryRes.error.message)
      if (hoursRes.error) throw new Error(hoursRes.error.message)
      if (totalItemsRes.error) throw new Error(totalItemsRes.error.message)

      const accountNameById = new Map((directoryRes.data ?? []).map((a) => [a.id, a.name]))
      const myProjects = (assignmentsRes.data ?? [])
        .map((a) => a.projects)
        .filter((p): p is { id: string; name: string; account_id: string | null } => p != null)

      const totalActive = totalItemsRes.count ?? 0
      const projectIds = myProjects.map((p) => p.id)

      const doneOrNaByProject = new Map<string, number>()
      if (projectIds.length > 0) {
        const runsRes = await supabase
          .from('checklist_runs')
          .select('project_id, status')
          .in('project_id', projectIds)
          .eq('month', month)
          .in('status', ['done', 'na'])
        if (runsRes.error) throw new Error(runsRes.error.message)
        for (const r of runsRes.data ?? []) {
          doneOrNaByProject.set(r.project_id, (doneOrNaByProject.get(r.project_id) ?? 0) + 1)
        }
      }

      const projects: MyProject[] = myProjects.map((p) => ({
        id: p.id,
        name: p.name,
        accountId: p.account_id,
        accountName: p.account_id ? accountNameById.get(p.account_id) ?? null : null,
        pendingChecklist: Math.max(0, totalActive - (doneOrNaByProject.get(p.id) ?? 0)),
        totalChecklist: totalActive,
      }))

      const hoursThisWeek = (hoursRes.data ?? []).reduce((s, e) => s + Number(e.hours), 0)

      return { projects, hoursThisWeek }
    },
    enabled: !!memberId,
  })
}

// ---------------------------------------------------------------------
// Admin/manager business overview
// ---------------------------------------------------------------------

export interface BusinessOverview {
  totalRetainerCents: number
  totalLaborCostCents: number
  totalExpensesCents: number
  totalProfitCents: number
  hoursLoggedThisMonth: number
  atRiskAccounts: { id: string; name: string; health: AccountHealth }[]
}

export function useBusinessOverview(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'business-overview'],
    queryFn: async (): Promise<BusinessOverview> => {
      const { start, end } = currentMonthRange()
      const [accountsRes, projectsRes, ratesRes, expensesRes] = await Promise.all([
        supabase.from('accounts').select('id, name, health, retainer_cents'),
        supabase.from('projects').select('id'),
        supabase.from('member_rates').select('member_id, cost_rate_cents'),
        supabase.from('expenses').select('amount_cents').gte('incurred_on', start).lte('incurred_on', end),
      ])
      if (accountsRes.error) throw new Error(accountsRes.error.message)
      if (projectsRes.error) throw new Error(projectsRes.error.message)
      if (ratesRes.error) throw new Error(ratesRes.error.message)
      if (expensesRes.error) throw new Error(expensesRes.error.message)

      const projectIds = (projectsRes.data ?? []).map((p) => p.id)
      let laborCostCents = 0
      let hoursLoggedThisMonth = 0
      if (projectIds.length > 0) {
        const entriesRes = await supabase
          .from('time_entries')
          .select('member_id, hours')
          .in('project_id', projectIds)
          .gte('worked_on', start)
          .lte('worked_on', end)
        if (entriesRes.error) throw new Error(entriesRes.error.message)
        const rateByMember = new Map((ratesRes.data ?? []).map((r) => [r.member_id, r.cost_rate_cents]))
        for (const e of entriesRes.data ?? []) {
          hoursLoggedThisMonth += Number(e.hours)
          const rate = rateByMember.get(e.member_id)
          if (rate != null) laborCostCents += Number(e.hours) * rate
        }
      }

      const totalRetainerCents = (accountsRes.data ?? []).reduce((s, a) => s + (a.retainer_cents ?? 0), 0)
      const totalExpensesCents = (expensesRes.data ?? []).reduce((s, e) => s + e.amount_cents, 0)
      const atRiskAccounts = (accountsRes.data ?? [])
        .filter((a) => a.health !== 'healthy')
        .map((a) => ({ id: a.id, name: a.name, health: a.health }))

      return {
        totalRetainerCents,
        totalLaborCostCents: laborCostCents,
        totalExpensesCents,
        totalProfitCents: totalRetainerCents - laborCostCents - totalExpensesCents,
        hoursLoggedThisMonth,
        atRiskAccounts,
      }
    },
    enabled,
  })
}
