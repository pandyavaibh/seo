import { useQuery } from '@tanstack/react-query'

import type { MemberRole } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export const DISCIPLINES = ['technical', 'content', 'offpage', 'analytics'] as const
export type Discipline = (typeof DISCIPLINES)[number]

export interface CapacityRow {
  id: string
  name: string
  role: MemberRole
  capacity: number
  booked: number
  ratio: number
  projectCount: number
  skills: Record<Discipline, number | null>
}

export interface CapacityData {
  rows: CapacityRow[]
  totalBooked: number
  totalCapacity: number
  singlePointsOfFailure: Discipline[]
}

export function useCapacity() {
  return useQuery({
    queryKey: ['capacity'],
    queryFn: async (): Promise<CapacityData> => {
      const [membersRes, assignmentsRes, skillsRes] = await Promise.all([
        supabase
          .from('team_members')
          .select('id, name, role, weekly_capacity')
          .eq('active', true)
          .order('name'),
        supabase
          .from('assignments')
          .select('member_id, project_id, weekly_hours, projects(stage)'),
        supabase.from('member_skills').select('member_id, discipline, level'),
      ])

      if (membersRes.error) throw new Error(membersRes.error.message)
      if (assignmentsRes.error) throw new Error(assignmentsRes.error.message)
      if (skillsRes.error) throw new Error(skillsRes.error.message)

      const skillsByMember = new Map<string, Record<Discipline, number | null>>()
      for (const m of membersRes.data ?? []) {
        skillsByMember.set(m.id, {
          technical: null,
          content: null,
          offpage: null,
          analytics: null,
        })
      }
      for (const s of skillsRes.data ?? []) {
        const bucket = skillsByMember.get(s.member_id)
        if (bucket && (DISCIPLINES as readonly string[]).includes(s.discipline)) {
          bucket[s.discipline as Discipline] = s.level
        }
      }

      const bookedByMember = new Map<string, number>()
      const projectsByMember = new Map<string, Set<string>>()
      for (const a of assignmentsRes.data ?? []) {
        const active = a.projects?.stage !== 'shipped'
        if (!active) continue
        bookedByMember.set(
          a.member_id,
          (bookedByMember.get(a.member_id) ?? 0) + Number(a.weekly_hours),
        )
        const set = projectsByMember.get(a.member_id) ?? new Set<string>()
        set.add(a.project_id)
        projectsByMember.set(a.member_id, set)
      }

      const rows: CapacityRow[] = (membersRes.data ?? []).map((m) => {
        const booked = bookedByMember.get(m.id) ?? 0
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          capacity: Number(m.weekly_capacity),
          booked,
          ratio: m.weekly_capacity > 0 ? booked / Number(m.weekly_capacity) : 0,
          projectCount: projectsByMember.get(m.id)?.size ?? 0,
          skills: skillsByMember.get(m.id) ?? {
            technical: null,
            content: null,
            offpage: null,
            analytics: null,
          },
        }
      })

      const singlePointsOfFailure = DISCIPLINES.filter(
        (d) => rows.filter((r) => (r.skills[d] ?? 0) >= 4).length === 1,
      )

      return {
        rows,
        totalBooked: rows.reduce((s, r) => s + r.booked, 0),
        totalCapacity: rows.reduce((s, r) => s + r.capacity, 0),
        singlePointsOfFailure,
      }
    },
  })
}
