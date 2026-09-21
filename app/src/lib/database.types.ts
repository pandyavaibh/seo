// Placeholder types, hand-written from supabase/migrations/*.sql because no
// real Supabase project is connected yet (see docs/STAGE_0.md). Once one
// exists, regenerate for real with:
//
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
//
// and delete this comment.

export type MemberRole = 'admin' | 'manager' | 'member' | 'client'
export type AccountHealth = 'healthy' | 'watch' | 'at_risk'
export type DealStage =
  | 'enquiry'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
export type ActivityKind = 'call' | 'meeting' | 'email' | 'note' | 'report' | 'issue'

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
          account_id: string | null
          project_type: string | null
          stage: string | null
          due_on: string | null
          weekly_hours: number | null
          health: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['projects']['Row']> & {
          id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Row']>
        Relationships: [
          {
            foreignKeyName: 'projects_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      accounts: {
        Row: {
          id: string
          name: string
          website: string | null
          industry: string | null
          health: AccountHealth
          retainer_cents: number | null
          currency: string
          hours_budget: number | null
          started_on: string | null
          renewal_on: string | null
          account_manager_id: string | null
          notes: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['accounts']['Row']> & {
          name: string
        }
        Update: Partial<Database['public']['Tables']['accounts']['Row']>
        Relationships: [
          {
            foreignKeyName: 'accounts_account_manager_id_fkey'
            columns: ['account_manager_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          account_id: string
          name: string
          role: string | null
          email: string | null
          phone: string | null
          is_primary: boolean
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['contacts']['Row']> & {
          account_id: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['contacts']['Row']>
        Relationships: [
          {
            foreignKeyName: 'contacts_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      deals: {
        Row: {
          id: string
          account_id: string | null
          name: string
          stage: DealStage
          value_cents: number | null
          source: string | null
          owner_id: string | null
          expected_close: string | null
          lost_reason: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['deals']['Row']> & {
          name: string
        }
        Update: Partial<Database['public']['Tables']['deals']['Row']>
        Relationships: [
          {
            foreignKeyName: 'deals_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      activities: {
        Row: {
          id: string
          account_id: string
          project_id: string | null
          kind: ActivityKind
          body: string
          author_id: string | null
          occurred_at: string
        }
        Insert: Partial<Database['public']['Tables']['activities']['Row']> & {
          account_id: string
          body: string
        }
        Update: Partial<Database['public']['Tables']['activities']['Row']>
        Relationships: [
          {
            foreignKeyName: 'activities_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
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
      account_health: AccountHealth
      deal_stage: DealStage
      activity_kind: ActivityKind
    }
    CompositeTypes: Record<string, never>
  }
}
