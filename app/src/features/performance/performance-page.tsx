import { BarChart3 } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

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
import { usePerformance } from '@/features/performance/use-performance'
import { initials, tintFor } from '@/lib/avatar'

function WeeklyHoursChart({ data }: { data: { weekStart: string; hours: number }[] }) {
  if (data.length === 0) return null
  const chartData = data.map((d) => ({
    week: new Date(`${d.weekStart}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    hours: Math.round(d.hours * 10) / 10,
  }))

  return (
    <div className="h-[140px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="week" tick={{ fontSize: 10.5, fill: 'var(--color-ink-muted)' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Bar dataKey="hours" radius={[4, 4, 0, 0]} fill="var(--color-brand)" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PerformancePage() {
  const { data, isLoading } = usePerformance()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">
          Hours, task throughput and checklist close-outs by person
        </span>
        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.02em]">Performance</h1>
      </div>

      <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-[8px]">
            <BarChart3 size={16} strokeWidth={2.25} className="text-ink-muted" />
            Team hours · last 8 weeks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-[16px_18px]">
          {isLoading && <Skeleton className="h-[140px] w-full" />}
          {!isLoading && <WeeklyHoursChart data={data?.weeklyTeamHours ?? []} />}
        </CardContent>
      </Card>

      <Card className="shadow-[0_1px_2px_rgba(23,25,28,0.04)]">
        <CardHeader>
          <CardTitle>This month, by person</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <Skeleton className="h-[160px] w-full" />}
          {!isLoading && (data?.rows.length ?? 0) === 0 && (
            <p className="m-0 p-[16px_18px] text-[13px] text-ink-muted">No active team members yet.</p>
          )}
          {!isLoading && (data?.rows.length ?? 0) > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Hours logged</TableHead>
                  <TableHead>Tasks completed</TableHead>
                  <TableHead>Tasks overdue</TableHead>
                  <TableHead>Checklist items closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((r) => (
                  <TableRow key={r.memberId}>
                    <TableCell>
                      <div className="flex items-center gap-[8px]">
                        <span
                          className="w-6 h-6 flex-none rounded-full grid place-items-center font-mono text-[9.5px] font-semibold"
                          style={{ background: tintFor(r.name.length) }}
                        >
                          {initials(r.name)}
                        </span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{r.hoursLoggedThisMonth.toFixed(1)}h</TableCell>
                    <TableCell className="font-mono">{r.tasksCompletedThisMonth}</TableCell>
                    <TableCell className={`font-mono ${r.tasksOverdue > 0 ? 'text-signal-red' : ''}`}>
                      {r.tasksOverdue}
                    </TableCell>
                    <TableCell className="font-mono">{r.checklistItemsClosedThisMonth}</TableCell>
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
