// Placeholder types, hand-written from supabase/migrations/*.sql because no
// real Supabase project is connected yet (see docs/STAGE_0.md). Once one
// exists, regenerate for real with:
//
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
//
// and delete this comment.

export type MemberRole = 'admin' | 'manager' | 'member' | 'client'
export type AccountHealth = 'healthy' | 'watch' | 'at_risk'
export type ActivityKind = 'call' | 'meeting' | 'email' | 'note' | 'report' | 'issue'
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'na'
export type MetricSource = 'gsc' | 'ga4'
export type ConnectionStatus = 'needs_access' | 'granted'
export type BacklinkStatus = 'prospect' | 'outreach' | 'placed' | 'declined' | 'removed'
export type ContentCalendarPlatform = 'facebook' | 'instagram' | 'other'
export type ContentCalendarStatus = 'draft' | 'scheduled' | 'approved' | 'published'
export type ExpenseCategory = 'link_cost' | 'tool' | 'other'
export type InvoiceKind = 'retainer' | 'project'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
export type ReportStatus = 'draft' | 'sent'
export type ChecklistPriority = 'high' | 'medium' | 'low'
export type ChecklistStatus = 'to_do' | 'in_progress' | 'done' | 'na'

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
          weekly_capacity: number
          account_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['team_members']['Row']> & {
          email: string
          name: string
        }
        Update: Partial<Database['public']['Tables']['team_members']['Row']>
        Relationships: [
          {
            foreignKeyName: 'team_members_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
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
          billing_cycle: string
          renewal_day: number | null
          traffic_goal_clicks: number | null
          conversions_goal: number | null
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
      project_goals: {
        Row: {
          id: string
          project_id: string
          label: string
          target_value: number | null
          current_value: number | null
          unit: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['project_goals']['Row']> & {
          project_id: string
          label: string
        }
        Update: Partial<Database['public']['Tables']['project_goals']['Row']>
        Relationships: [
          {
            foreignKeyName: 'project_goals_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      backlinks: {
        Row: {
          id: string
          project_id: string
          domain: string
          source_url: string | null
          target_url: string | null
          anchor_text: string | null
          status: BacklinkStatus
          cost_cents: number | null
          contact_email: string | null
          notes: string | null
          owner_id: string | null
          placed_on: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['backlinks']['Row']> & {
          project_id: string
          domain: string
        }
        Update: Partial<Database['public']['Tables']['backlinks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'backlinks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'backlinks_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'team_members'
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
          weekly_hours: number
          starts_on: string | null
          ends_on: string | null
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
          priority: ChecklistPriority | null
          reference_tag: string | null
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
          status: ChecklistStatus
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
      offpage_activity_entries: {
        Row: {
          id: string
          project_id: string
          activity_type: string
          entry_date: string
          count: number
          note: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['offpage_activity_entries']['Row']> & {
          project_id: string
          activity_type: string
          entry_date: string
          count: number
        }
        Update: Partial<Database['public']['Tables']['offpage_activity_entries']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offpage_activity_entries_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'offpage_activity_entries_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      offpage_activity_types: {
        Row: {
          activity_type: string
          target_min: number
          target_max: number
          sort_order: number
        }
        Insert: Partial<Database['public']['Tables']['offpage_activity_types']['Row']> & {
          activity_type: string
          target_min: number
          target_max: number
        }
        Update: Partial<Database['public']['Tables']['offpage_activity_types']['Row']>
        Relationships: []
      }
      offpage_recurring_runs: {
        Row: {
          id: string
          project_id: string
          month: string
          task_key: string
          instance_key: string
          done: boolean
          done_by: string | null
          done_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['offpage_recurring_runs']['Row']> & {
          project_id: string
          month: string
          task_key: string
        }
        Update: Partial<Database['public']['Tables']['offpage_recurring_runs']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offpage_recurring_runs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      offpage_notes: {
        Row: {
          project_id: string
          month: string
          note: string | null
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['offpage_notes']['Row']> & {
          project_id: string
          month: string
        }
        Update: Partial<Database['public']['Tables']['offpage_notes']['Row']>
        Relationships: [
          {
            foreignKeyName: 'offpage_notes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      technical_audits: {
        Row: {
          id: string
          account_id: string
          url: string
          run_at: string
          performance_score: number | null
          seo_score: number | null
          accessibility_score: number | null
          best_practices_score: number | null
          lcp_ms: number | null
          cls: number | null
          inp_ms: number | null
          has_robots_txt: boolean | null
          has_sitemap: boolean | null
          error: string | null
          run_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['technical_audits']['Row']> & {
          account_id: string
          url: string
        }
        Update: Partial<Database['public']['Tables']['technical_audits']['Row']>
        Relationships: [
          {
            foreignKeyName: 'technical_audits_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      agency_settings: {
        Row: {
          id: string
          agency_name: string
          logo_url: string | null
          primary_color: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['agency_settings']['Row']>
        Update: Partial<Database['public']['Tables']['agency_settings']['Row']>
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          company: string | null
          message: string | null
          source: string
          status: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['leads']['Row']> & {
          name: string
          email: string
        }
        Update: Partial<Database['public']['Tables']['leads']['Row']>
        Relationships: []
      }
      report_schedules: {
        Row: {
          id: string
          account_id: string
          recipient_email: string
          send_day: number
          active: boolean
          last_sent_period_end: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['report_schedules']['Row']> & {
          account_id: string
          recipient_email: string
          send_day: number
        }
        Update: Partial<Database['public']['Tables']['report_schedules']['Row']>
        Relationships: [
          {
            foreignKeyName: 'report_schedules_account_id_fkey'
            columns: ['account_id']
            isOneToOne: true
            referencedRelation: 'accounts'
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
          target_rank: number | null
          search_volume: number | null
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
      time_entries: {
        Row: {
          id: string
          project_id: string
          member_id: string
          task_id: string | null
          hours: number
          worked_on: string
          note: string
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['time_entries']['Row']> & {
          project_id: string
          member_id: string
          hours: number
          note: string
        }
        Update: Partial<Database['public']['Tables']['time_entries']['Row']>
        Relationships: [
          {
            foreignKeyName: 'time_entries_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'time_entries_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          label: string
          status: TaskStatus
          owner_id: string | null
          estimate_hours: number | null
          due_on: string | null
          priority: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['tasks']['Row']> & {
          project_id: string
          label: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Row']>
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      member_skills: {
        Row: {
          member_id: string
          discipline: string
          level: number
        }
        Insert: Partial<Database['public']['Tables']['member_skills']['Row']> & {
          member_id: string
          discipline: string
          level: number
        }
        Update: Partial<Database['public']['Tables']['member_skills']['Row']>
        Relationships: [
          {
            foreignKeyName: 'member_skills_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      member_leave: {
        Row: {
          id: string
          member_id: string
          starts_on: string
          ends_on: string
          kind: string | null
          note: string | null
        }
        Insert: Partial<Database['public']['Tables']['member_leave']['Row']> & {
          member_id: string
          starts_on: string
          ends_on: string
        }
        Update: Partial<Database['public']['Tables']['member_leave']['Row']>
        Relationships: [
          {
            foreignKeyName: 'member_leave_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      search_connections: {
        Row: {
          id: string
          account_id: string
          source: MetricSource
          property: string
          status: ConnectionStatus
          last_checked_at: string | null
          last_synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<
          Database['public']['Tables']['search_connections']['Row']
        > & { account_id: string; source: MetricSource; property: string }
        Update: Partial<Database['public']['Tables']['search_connections']['Row']>
        Relationships: [
          {
            foreignKeyName: 'search_connections_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      metric_snapshots: {
        Row: {
          account_id: string
          source: MetricSource
          snapshot_date: string
          metric_key: string
          value: number
        }
        Insert: Database['public']['Tables']['metric_snapshots']['Row']
        Update: Partial<Database['public']['Tables']['metric_snapshots']['Row']>
        Relationships: [
          {
            foreignKeyName: 'metric_snapshots_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      search_queries_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          query: string
          clicks: number
          impressions: number
          ctr: number
          avg_position: number
        }
        Insert: Partial<
          Database['public']['Tables']['search_queries_daily']['Row']
        > & { account_id: string; snapshot_date: string; query: string }
        Update: Partial<
          Database['public']['Tables']['search_queries_daily']['Row']
        >
        Relationships: [
          {
            foreignKeyName: 'search_queries_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      search_pages_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          page: string
          clicks: number
          impressions: number
          ctr: number
          avg_position: number
        }
        Insert: Partial<
          Database['public']['Tables']['search_pages_daily']['Row']
        > & { account_id: string; snapshot_date: string; page: string }
        Update: Partial<Database['public']['Tables']['search_pages_daily']['Row']>
        Relationships: [
          {
            foreignKeyName: 'search_pages_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      search_countries_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          country: string
          clicks: number
          impressions: number
          ctr: number
          avg_position: number
        }
        Insert: Partial<
          Database['public']['Tables']['search_countries_daily']['Row']
        > & { account_id: string; snapshot_date: string; country: string }
        Update: Partial<
          Database['public']['Tables']['search_countries_daily']['Row']
        >
        Relationships: [
          {
            foreignKeyName: 'search_countries_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      search_devices_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          device: string
          clicks: number
          impressions: number
          ctr: number
          avg_position: number
        }
        Insert: Partial<
          Database['public']['Tables']['search_devices_daily']['Row']
        > & { account_id: string; snapshot_date: string; device: string }
        Update: Partial<Database['public']['Tables']['search_devices_daily']['Row']>
        Relationships: [
          {
            foreignKeyName: 'search_devices_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      ga4_channels_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          channel: string
          sessions: number
          conversions: number
        }
        Insert: Partial<
          Database['public']['Tables']['ga4_channels_daily']['Row']
        > & { account_id: string; snapshot_date: string; channel: string }
        Update: Partial<Database['public']['Tables']['ga4_channels_daily']['Row']>
        Relationships: [
          {
            foreignKeyName: 'ga4_channels_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      ga4_landing_pages_daily: {
        Row: {
          account_id: string
          snapshot_date: string
          landing_page: string
          sessions: number
          engaged_sessions: number
          conversions: number
        }
        Insert: Partial<
          Database['public']['Tables']['ga4_landing_pages_daily']['Row']
        > & { account_id: string; snapshot_date: string; landing_page: string }
        Update: Partial<
          Database['public']['Tables']['ga4_landing_pages_daily']['Row']
        >
        Relationships: [
          {
            foreignKeyName: 'ga4_landing_pages_daily_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      content_calendar: {
        Row: {
          id: string
          account_id: string
          project_id: string | null
          platform: ContentCalendarPlatform
          caption: string | null
          scheduled_on: string | null
          owner_id: string | null
          status: ContentCalendarStatus
          permalink: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['content_calendar']['Row']> & {
          account_id: string
          platform: ContentCalendarPlatform
        }
        Update: Partial<Database['public']['Tables']['content_calendar']['Row']>
        Relationships: [
          {
            foreignKeyName: 'content_calendar_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_calendar_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'content_calendar_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      member_rates: {
        Row: {
          member_id: string
          cost_rate_cents: number
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['member_rates']['Row']> & {
          member_id: string
          cost_rate_cents: number
        }
        Update: Partial<Database['public']['Tables']['member_rates']['Row']>
        Relationships: [
          {
            foreignKeyName: 'member_rates_member_id_fkey'
            columns: ['member_id']
            isOneToOne: true
            referencedRelation: 'team_members'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          id: string
          account_id: string
          project_id: string | null
          category: ExpenseCategory
          description: string
          amount_cents: number
          incurred_on: string
          created_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & {
          account_id: string
          category: ExpenseCategory
          description: string
          amount_cents: number
        }
        Update: Partial<Database['public']['Tables']['expenses']['Row']>
        Relationships: [
          {
            foreignKeyName: 'expenses_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expenses_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          account_id: string
          kind: InvoiceKind
          period_start: string | null
          period_end: string | null
          amount_cents: number
          status: InvoiceStatus
          issued_on: string | null
          due_on: string | null
          paid_on: string | null
          notes: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['invoices']['Row']> & {
          account_id: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Row']>
        Relationships: [
          {
            foreignKeyName: 'invoices_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          amount_cents: number
        }
        Insert: Partial<Database['public']['Tables']['invoice_line_items']['Row']> & {
          invoice_id: string
          description: string
          amount_cents: number
        }
        Update: Partial<Database['public']['Tables']['invoice_line_items']['Row']>
        Relationships: [
          {
            foreignKeyName: 'invoice_line_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
        ]
      }
      deliverables: {
        Row: {
          id: string
          account_id: string
          project_id: string | null
          title: string
          url: string | null
          delivered_on: string
          created_by: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['deliverables']['Row']> & {
          account_id: string
          title: string
        }
        Update: Partial<Database['public']['Tables']['deliverables']['Row']>
        Relationships: [
          {
            foreignKeyName: 'deliverables_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deliverables_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          id: string
          account_id: string
          period_start: string
          period_end: string
          status: ReportStatus
          next_month_plan: string | null
          snapshot: Record<string, unknown>
          generated_by: string | null
          generated_at: string
          sent_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['reports']['Row']> & {
          account_id: string
          period_start: string
          period_end: string
        }
        Update: Partial<Database['public']['Tables']['reports']['Row']>
        Relationships: [
          {
            foreignKeyName: 'reports_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      portal_comments: {
        Row: {
          id: string
          account_id: string
          body: string
          author_id: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['portal_comments']['Row']> & {
          account_id: string
          body: string
        }
        Update: Partial<Database['public']['Tables']['portal_comments']['Row']>
        Relationships: [
          {
            foreignKeyName: 'portal_comments_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portal_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'team_members'
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
      activity_kind: ActivityKind
      task_status: TaskStatus
      metric_source: MetricSource
      connection_status: ConnectionStatus
      backlink_status: BacklinkStatus
      content_calendar_platform: ContentCalendarPlatform
      content_calendar_status: ContentCalendarStatus
      expense_category: ExpenseCategory
      invoice_kind: InvoiceKind
      invoice_status: InvoiceStatus
      report_status: ReportStatus
      checklist_priority: ChecklistPriority
      checklist_status: ChecklistStatus
    }
    CompositeTypes: Record<string, never>
  }
}
