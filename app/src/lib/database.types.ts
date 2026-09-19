// Placeholder types, hand-written from supabase/migrations/*.sql because no
// real Supabase project is connected yet (see docs/STAGE_0.md). Once one
// exists, regenerate for real with:
//
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
//
// and delete this comment.

export type MemberRole = 'admin' | 'manager' | 'member' | 'client'

export interface Database {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string
          email: string
          name: string
          role: MemberRole
          active: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['team_members']['Row']> & {
          email: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['team_members']['Row']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          client_name: string | null
          status: string
          link_target: number
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['projects']['Row']> & {
          id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Row']>
        Relationships: []
      }
      assignments: {
        Row: {
          id: string
          project_id: string
          member_id: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['assignments']['Row']> & {
          project_id: string
          member_id: string
        }
        Update: Partial<Database['public']['Tables']['assignments']['Row']>
        Relationships: [
          {
            foreignKeyName: 'assignments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assignments_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      checklist_template_items: {
        Row: {
          id: string
          label: string
          category: string | null
          sort_order: number
          active: boolean
        }
        Insert: Partial<
          Database['public']['Tables']['checklist_template_items']['Row']
        > & { label: string }
        Update: Partial<
          Database['public']['Tables']['checklist_template_items']['Row']
        >
        Relationships: []
      }
      checklist_runs: {
        Row: {
          id: string
          project_id: string
          template_item_id: string
          month: string
          done: boolean
          note: string | null
          done_by: string | null
          done_at: string | null
          updated_at: string
        }
        Insert: Partial<
          Database['public']['Tables']['checklist_runs']['Row']
        > & { project_id: string; template_item_id: string; month: string }
        Update: Partial<Database['public']['Tables']['checklist_runs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'checklist_runs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checklist_runs_template_item_id_fkey'
            columns: ['template_item_id']
            isOneToOne: false
            referencedRelation: 'checklist_template_items'
            referencedColumns: ['id']
          },
        ]
      }
      offpage_runs: {
        Row: {
          id: string
          project_id: string
          month: string
          activity_type: string
          count: number
          updated_by: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['offpage_runs']['Row']> & {
          project_id: string
          month: string
          activity_type: string
        }
        Update: Partial<Database['public']['Tables']['offpage_runs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offpage_runs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      keywords: {
        Row: {
          id: string
          project_id: string
          phrase: string
          target_url: string | null
          archived: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['keywords']['Row']> & {
          project_id: string
          phrase: string
        }
        Update: Partial<Database['public']['Tables']['keywords']['Row']>
        Relationships: [
          {
            foreignKeyName: 'keywords_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      keyword_checks: {
        Row: {
          id: string
          keyword_id: string
          project_id: string
          rank: number | null
          checked_on: string
          checked_by: string | null
          created_at: string
        }
        Insert: Partial<
          Database['public']['Tables']['keyword_checks']['Row']
        > & { keyword_id: string; project_id: string }
        Update: Partial<Database['public']['Tables']['keyword_checks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'keyword_checks_keyword_id_fkey'
            columns: ['keyword_id']
            isOneToOne: false
            referencedRelation: 'keywords'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'keyword_checks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          id: number
          table_name: string
          row_id: string
          action: string
          actor_email: string | null
          changed: unknown
          at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      member_role: MemberRole
    }
    CompositeTypes: Record<string, never>
  }
}
