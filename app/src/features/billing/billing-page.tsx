import { ArrowLeft } from 'lucide-react'
import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

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
  useAddExpense,
  useCreateInvoice,
  useDeleteExpense,
  useDeleteInvoice,
  useExpenses,
  useInvoices,
  useProfitability,
  useUpdateInvoiceStatus,
  type ExpenseRow,
  type InvoiceRow,
  type NewInvoiceInput,
} from '@/features/billing/use-billing'
import { useCurrentMember } from '@/features/team/use-current-member'
import type { ExpenseCategory } from '@/lib/database.types'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, INVOICE_STATUSES } from '@/lib/invoice-status'

function formatCents(cents: number | null) {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['link_cost', 'tool', 'other']
const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  link_cost: 'Link cost',
  tool: 'Tool / software',
  other: 'Other',
}

function NewInvoiceForm({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const createInvoice = useCreateInvoice(accountId)
  const [periodStart, setPeriodStart] = React.useState('')
  const [periodEnd, setPeriodEnd] = React.useState('')
  const [dueOn, setDueOn] = React.useState('')
  const [lineItems, setLineItems] = React.useState([{ description: 'Monthly retainer', amountDollars: '' }])

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <Card>
      <CardHeader>
        <CardTitle>New invoice</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px] flex flex-col gap-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Period start</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Period end</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Due</span>
            <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={fieldClass} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-ink-muted">Line items</span>
          {lineItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item.description}
                onChange={(e) => {
                  const next = [...lineItems]
                  next[i] = { ...next[i], description: e.target.value }
                  setLineItems(next)
                }}
                placeholder="Description"
                className={fieldClass}
              />
              <input
                value={item.amountDollars}
                onChange={(e) => {
                  const next = [...lineItems]
                  next[i] = { ...next[i], amountDollars: e.target.value }
                  setLineItems(next)
                }}
                placeholder="$"
                inputMode="decimal"
                className="text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-[100px]"
              />
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLineItems([...lineItems, { description: '', amountDollars: '' }])}
          >
            Add line item
          </Button>
        </div>
        {createInvoice.isError && (
          <p className="m-0 text-[12px] text-signal-red">
            {createInvoice.error instanceof Error ? createInvoice.error.message : 'Failed to create invoice'}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            disabled={createInvoice.isPending}
            onClick={() => {
              const input: NewInvoiceInput = { kind: 'retainer', periodStart, periodEnd, dueOn, lineItems }
              createInvoice.mutate(input, { onSuccess: onClose })
            }}
          >
            {createInvoice.isPending ? 'Creating…' : 'Create invoice'}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={createInvoice.isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function InvoiceRowView({ accountId, invoice }: { accountId: string; invoice: InvoiceRow }) {
  const updateStatus = useUpdateInvoiceStatus(accountId)
  const remove = useDeleteInvoice(accountId)

  return (
    <TableRow>
      <TableCell className="text-[12px] font-mono text-ink-muted">
        {invoice.periodStart ?? '—'} – {invoice.periodEnd ?? '—'}
      </TableCell>
      <TableCell className="font-mono text-[12px]">{formatCents(invoice.amountCents)}</TableCell>
      <TableCell className="text-[12px] text-ink-muted">{invoice.dueOn ?? '—'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>{INVOICE_STATUS_LABEL[invoice.status]}</Badge>
          <select
            value={invoice.status}
            onChange={(e) => updateStatus.mutate({ id: invoice.id, status: e.target.value as InvoiceRow['status'] })}
            disabled={updateStatus.isPending}
            className="font-mono text-[11px] border border-border rounded-[6px] px-1 py-[3px] bg-surface"
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </TableCell>
      <TableCell>
        <button
          onClick={() => remove.mutate(invoice.id)}
          disabled={remove.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      </TableCell>
    </TableRow>
  )
}

function InvoicesCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useInvoices(accountId)
  const [showNew, setShowNew] = React.useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[16px] font-semibold">Invoices</h2>
        {!showNew && <Button size="sm" onClick={() => setShowNew(true)}>New invoice</Button>}
      </div>
      {showNew && <NewInvoiceForm accountId={accountId} onClose={() => setShowNew(false)} />}
      {isLoading && <Skeleton className="h-[140px] w-full" />}
      {!isLoading && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {(data ?? []).length === 0 ? (
              <p className="m-0 p-[18px] text-[13px] text-ink-muted">No invoices yet.</p>
            ) : (
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((inv) => (
                    <InvoiceRowView key={inv.id} accountId={accountId} invoice={inv} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AddExpenseForm({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const addExpense = useAddExpense(accountId)
  const [category, setCategory] = React.useState<ExpenseCategory>('tool')
  const [description, setDescription] = React.useState('')
  const [amountDollars, setAmountDollars] = React.useState('')
  const [incurredOn, setIncurredOn] = React.useState(new Date().toISOString().slice(0, 10))

  const fieldClass = 'text-[13px] rounded-[8px] border border-border px-3 py-2 bg-surface w-full'

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={fieldClass}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{EXPENSE_CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={fieldClass} />
        <input value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} placeholder="$" inputMode="decimal" className={fieldClass} />
        <input type="date" value={incurredOn} onChange={(e) => setIncurredOn(e.target.value)} className={fieldClass} />
      </div>
      {addExpense.isError && (
        <p className="m-0 text-[12px] text-signal-red">
          {addExpense.error instanceof Error ? addExpense.error.message : 'Failed to add expense'}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={!description.trim() || !amountDollars.trim() || addExpense.isPending}
          onClick={() =>
            addExpense.mutate({ category, description, amountDollars, incurredOn }, { onSuccess: onClose })
          }
        >
          {addExpense.isPending ? 'Adding…' : 'Add expense'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function ExpenseRowView({ accountId, expense }: { accountId: string; expense: ExpenseRow }) {
  const remove = useDeleteExpense(accountId)
  return (
    <TableRow>
      <TableCell className="text-[12px] font-mono text-ink-muted">{expense.incurredOn}</TableCell>
      <TableCell className="text-[12.5px] capitalize">{EXPENSE_CATEGORY_LABEL[expense.category]}</TableCell>
      <TableCell className="text-[12.5px]">{expense.description}</TableCell>
      <TableCell className="font-mono text-[12px]">{formatCents(expense.amountCents)}</TableCell>
      <TableCell>
        <button
          onClick={() => remove.mutate(expense.id)}
          disabled={remove.isPending}
          className="border-none bg-transparent font-mono text-[10.5px] text-ink-muted hover:text-signal-red cursor-pointer p-0"
        >
          Remove
        </button>
      </TableCell>
    </TableRow>
  )
}

function ExpensesCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useExpenses(accountId)
  const [showNew, setShowNew] = React.useState(false)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[16px] font-semibold">Expenses</h2>
        {!showNew && <Button size="sm" variant="secondary" onClick={() => setShowNew(true)}>Add expense</Button>}
      </div>
      {showNew && <AddExpenseForm accountId={accountId} onClose={() => setShowNew(false)} />}
      {isLoading && <Skeleton className="h-[100px] w-full" />}
      {!isLoading && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {(data ?? []).length === 0 ? (
              <p className="m-0 p-[18px] text-[13px] text-ink-muted">No expenses logged yet.</p>
            ) : (
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data ?? []).map((e) => (
                    <ExpenseRowView key={e.id} accountId={accountId} expense={e} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProfitabilityCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useProfitability(accountId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profitability (this month, admin only)</CardTitle>
      </CardHeader>
      <CardContent className="p-[16px_18px]">
        {isLoading && <Skeleton className="h-[80px] w-full" />}
        {!isLoading && data && (
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Retainer</span>
              <span className="text-[16px] font-semibold">{formatCents(data.retainerCents)}</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Labor cost ({data.hoursLogged}h)</span>
              <span className="text-[16px] font-semibold">{formatCents(data.laborCostCents)}</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Link costs</span>
              <span className="text-[16px] font-semibold">{formatCents(data.linkCostsCents)}</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Other expenses</span>
              <span className="text-[16px] font-semibold">{formatCents(data.expensesCents)}</span>
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="font-mono text-[10px] uppercase text-ink-muted">Profit</span>
              <span
                className="text-[16px] font-semibold"
                style={{ color: data.profitCents != null && data.profitCents < 0 ? 'var(--color-signal-red)' : undefined }}
              >
                {formatCents(data.profitCents)}
              </span>
            </div>
          </div>
        )}
        <p className="m-0 mt-3 text-[11px] text-ink-faint">
          Labor cost only counts hours from staff with a rate set (Team → cost rates, admin only).
          Missing rates undercount cost rather than guess — see docs/STAGE_7.md.
        </p>
      </CardContent>
    </Card>
  )
}

export function BillingPage() {
  const { accountId } = useParams<{ accountId: string }>()
  const navigate = useNavigate()
  const { data: acc } = useAccount(accountId)
  const { data: currentMember } = useCurrentMember()
  const isAdmin = currentMember?.role === 'admin'

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate(accountId ? `/clients/${accountId}` : '/clients')}
        className="self-start flex items-center gap-1 border-none bg-transparent font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted hover:text-ink cursor-pointer p-0"
      >
        <ArrowLeft size={12} /> {acc?.name ?? 'Account'}
      </button>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          {acc?.website ?? '—'} · Billing
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Billing</h1>
      </div>

      {accountId && <InvoicesCard accountId={accountId} />}
      {accountId && <ExpensesCard accountId={accountId} />}
      {accountId && isAdmin && <ProfitabilityCard accountId={accountId} />}
    </div>
  )
}
