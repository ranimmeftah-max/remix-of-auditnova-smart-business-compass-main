export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_reports: {
        Row: {
          created_at: string
          findings: Json | null
          id: string
          period_label: string | null
          score: number | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          findings?: Json | null
          id?: string
          period_label?: string | null
          score?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          findings?: Json | null
          id?: string
          period_label?: string | null
          score?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          employees_count: number | null
          founded_year: number | null
          id: string
          legal_name: string
          logo_url: string | null
          nif: string | null
          nis: string | null
          rc: string | null
          sector: string | null
          stage: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
          website: string | null
          wilaya_code: number | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          employees_count?: number | null
          founded_year?: number | null
          id?: string
          legal_name: string
          logo_url?: string | null
          nif?: string | null
          nis?: string | null
          rc?: string | null
          sector?: string | null
          stage?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          wilaya_code?: number | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          employees_count?: number | null
          founded_year?: number | null
          id?: string
          legal_name?: string
          logo_url?: string | null
          nif?: string | null
          nis?: string | null
          rc?: string | null
          sector?: string | null
          stage?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          wilaya_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      company_listings: {
        Row: {
          company_name: string
          contact_email: string | null
          created_at: string
          description: string | null
          employees_count: number | null
          founded_year: number | null
          id: string
          is_published: boolean
          logo_url: string | null
          revenue_dzd: number | null
          sector: string | null
          stage: string | null
          status: string
          tags: string[] | null
          ticket_size_dzd: number | null
          updated_at: string
          user_id: string
          valuation_dzd: number | null
          website: string | null
          wilaya_code: number | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          employees_count?: number | null
          founded_year?: number | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          revenue_dzd?: number | null
          sector?: string | null
          stage?: string | null
          status?: string
          tags?: string[] | null
          ticket_size_dzd?: number | null
          updated_at?: string
          user_id: string
          valuation_dzd?: number | null
          website?: string | null
          wilaya_code?: number | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          employees_count?: number | null
          founded_year?: number | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          revenue_dzd?: number | null
          sector?: string | null
          stage?: string | null
          status?: string
          tags?: string[] | null
          ticket_size_dzd?: number | null
          updated_at?: string
          user_id?: string
          valuation_dzd?: number | null
          website?: string | null
          wilaya_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_listings_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      financial_periods: {
        Row: {
          assets_dzd: number | null
          cash_dzd: number | null
          cogs_dzd: number | null
          created_at: string
          customers_count: number | null
          ebitda_dzd: number | null
          equity_dzd: number | null
          id: string
          liabilities_dzd: number | null
          net_income_dzd: number | null
          notes: string | null
          opex_dzd: number | null
          period_end: string
          period_label: string
          period_start: string
          revenue_dzd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assets_dzd?: number | null
          cash_dzd?: number | null
          cogs_dzd?: number | null
          created_at?: string
          customers_count?: number | null
          ebitda_dzd?: number | null
          equity_dzd?: number | null
          id?: string
          liabilities_dzd?: number | null
          net_income_dzd?: number | null
          notes?: string | null
          opex_dzd?: number | null
          period_end: string
          period_label: string
          period_start: string
          revenue_dzd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assets_dzd?: number | null
          cash_dzd?: number | null
          cogs_dzd?: number | null
          created_at?: string
          customers_count?: number | null
          ebitda_dzd?: number | null
          equity_dzd?: number | null
          id?: string
          liabilities_dzd?: number | null
          net_income_dzd?: number | null
          notes?: string | null
          opex_dzd?: number | null
          period_end?: string
          period_label?: string
          period_start?: string
          revenue_dzd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_opportunities: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          ebitda_dzd: number | null
          id: string
          notes: string | null
          recommendation: Database["public"]["Enums"]["opportunity_recommendation"]
          revenue_dzd: number | null
          score_financial: number | null
          score_legal: number | null
          score_market: number | null
          score_overall: number | null
          score_risk: number | null
          score_team: number | null
          sector: string | null
          stage: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          ticket_size_dzd: number | null
          updated_at: string
          user_id: string
          valuation_dzd: number | null
          wilaya_code: number | null
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          ebitda_dzd?: number | null
          id?: string
          notes?: string | null
          recommendation?: Database["public"]["Enums"]["opportunity_recommendation"]
          revenue_dzd?: number | null
          score_financial?: number | null
          score_legal?: number | null
          score_market?: number | null
          score_overall?: number | null
          score_risk?: number | null
          score_team?: number | null
          sector?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          ticket_size_dzd?: number | null
          updated_at?: string
          user_id: string
          valuation_dzd?: number | null
          wilaya_code?: number | null
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          ebitda_dzd?: number | null
          id?: string
          notes?: string | null
          recommendation?: Database["public"]["Enums"]["opportunity_recommendation"]
          revenue_dzd?: number | null
          score_financial?: number | null
          score_legal?: number | null
          score_market?: number | null
          score_overall?: number | null
          score_risk?: number | null
          score_team?: number | null
          sector?: string | null
          stage?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          ticket_size_dzd?: number | null
          updated_at?: string
          user_id?: string
          valuation_dzd?: number | null
          wilaya_code?: number | null
        }
        Relationships: []
      }
      investment_rounds: {
        Row: {
          close_date: string | null
          created_at: string
          id: string
          notes: string | null
          open_date: string | null
          pre_money_dzd: number | null
          raised_amount_dzd: number | null
          round_name: string
          status: string
          target_amount_dzd: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          close_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          open_date?: string | null
          pre_money_dzd?: number | null
          raised_amount_dzd?: number | null
          round_name: string
          status?: string
          target_amount_dzd?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          close_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          open_date?: string | null
          pre_money_dzd?: number | null
          raised_amount_dzd?: number | null
          round_name?: string
          status?: string
          target_amount_dzd?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lms_certificates: {
        Row: {
          course_id: string
          id: string
          issued_at: string
          user_id: string
          verification_code: string
        }
        Insert: {
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
          verification_code?: string
        }
        Update: {
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_courses: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          instructor_id: string | null
          is_published: boolean
          language: string
          level: string
          price_dzd: number
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          language?: string
          level?: string
          price_dzd?: number
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean
          language?: string
          level?: string
          price_dzd?: number
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lms_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_pct: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_pct?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          is_completed: boolean
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          is_completed?: boolean
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          content_md: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_free_preview: boolean
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content_md?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content_md?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lms_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_attempts: {
        Row: {
          answers: Json | null
          attempted_at: string
          id: string
          max_score: number
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          attempted_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          attempted_at?: string
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_choices: {
        Row: {
          choice_text: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
        }
        Insert: {
          choice_text: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id: string
        }
        Update: {
          choice_text?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lms_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_questions: {
        Row: {
          created_at: string
          id: string
          points: number
          position: number
          question_text: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points?: number
          position?: number
          question_text: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          position?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lms_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          pass_score: number
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          pass_score?: number
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          pass_score?: number
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      message_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pro_analyses: {
        Row: {
          analysis_type: string | null
          client_id: string | null
          created_at: string
          data: Json
          id: string
          score: number | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type?: string | null
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          score?: number | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string | null
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          score?: number | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pro_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_appointments: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pro_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          sector: string | null
          status: string
          updated_at: string
          user_id: string
          wilaya_code: number | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wilaya_code?: number | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wilaya_code?: number | null
        }
        Relationships: []
      }
      pro_compliance_checks: {
        Row: {
          client_id: string | null
          created_at: string
          framework: string
          id: string
          item: string
          notes: string | null
          reviewed_at: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          framework: string
          id?: string
          item: string
          notes?: string | null
          reviewed_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          framework?: string
          id?: string
          item?: string
          notes?: string | null
          reviewed_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_compliance_checks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pro_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_engagements: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          engagement_type: string | null
          fee_dzd: number | null
          id: string
          progress: number
          start_date: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          engagement_type?: string | null
          fee_dzd?: number | null
          id?: string
          progress?: number
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          engagement_type?: string | null
          fee_dzd?: number | null
          id?: string
          progress?: number
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pro_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_subtype: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          locale: string
          phone: string | null
          updated_at: string
          wilaya_code: number | null
        }
        Insert: {
          account_subtype?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
          wilaya_code?: number | null
        }
        Update: {
          account_subtype?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
          wilaya_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      risk_items: {
        Row: {
          category: string | null
          created_at: string
          due_date: string | null
          id: string
          impact: Database["public"]["Enums"]["risk_level"]
          likelihood: Database["public"]["Enums"]["risk_level"]
          mitigation: string | null
          owner: string | null
          status: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["risk_level"]
          likelihood?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          impact?: Database["public"]["Enums"]["risk_level"]
          likelihood?: Database["public"]["Enums"]["risk_level"]
          mitigation?: string | null
          owner?: string | null
          status?: Database["public"]["Enums"]["risk_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          discount_code: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          discount_code?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          discount_code?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wilayas: {
        Row: {
          code: number
          name_ar: string
          name_en: string
          name_fr: string
        }
        Insert: {
          code: number
          name_ar: string
          name_en: string
          name_fr: string
        }
        Update: {
          code?: number
          name_ar?: string
          name_en?: string
          name_fr?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      account_type: "enterprise" | "professional" | "academic" | "investor"
      app_role: "admin" | "user" | "instructor"
      opportunity_recommendation: "go" | "hold" | "no_go" | "pending"
      opportunity_status:
        | "screening"
        | "due_diligence"
        | "negotiation"
        | "closed"
        | "passed"
      risk_level: "low" | "medium" | "high" | "critical"
      risk_status: "open" | "mitigating" | "closed"
      subscription_plan: "free" | "monthly" | "annual"
      subscription_status: "trialing" | "active" | "past_due" | "canceled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["enterprise", "professional", "academic", "investor"],
      app_role: ["admin", "user", "instructor"],
      opportunity_recommendation: ["go", "hold", "no_go", "pending"],
      opportunity_status: [
        "screening",
        "due_diligence",
        "negotiation",
        "closed",
        "passed",
      ],
      risk_level: ["low", "medium", "high", "critical"],
      risk_status: ["open", "mitigating", "closed"],
      subscription_plan: ["free", "monthly", "annual"],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
    },
  },
} as const
