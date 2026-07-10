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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      checkout_pages: {
        Row: {
          blocks: Json
          bump_description: string | null
          bump_discount_pct: number
          bump_enabled: boolean
          bump_headline: string | null
          bump_product_id: string | null
          bump_product_type: string | null
          created_at: string
          creator_id: string
          id: string
          is_published: boolean
          name: string
          product_id: string
          product_type: string
          slug: string
          theme: Json
          updated_at: string
        }
        Insert: {
          blocks?: Json
          bump_description?: string | null
          bump_discount_pct?: number
          bump_enabled?: boolean
          bump_headline?: string | null
          bump_product_id?: string | null
          bump_product_type?: string | null
          created_at?: string
          creator_id: string
          id?: string
          is_published?: boolean
          name?: string
          product_id: string
          product_type: string
          slug: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          blocks?: Json
          bump_description?: string | null
          bump_discount_pct?: number
          bump_enabled?: boolean
          bump_headline?: string | null
          bump_product_id?: string | null
          bump_product_type?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          is_published?: boolean
          name?: string
          product_id?: string
          product_type?: string
          slug?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_pages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          access_mode: Database["public"]["Enums"]["community_access_mode"]
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          price_clp: number
          slug: string
          updated_at: string
        }
        Insert: {
          access_mode?: Database["public"]["Enums"]["community_access_mode"]
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          price_clp?: number
          slug: string
          updated_at?: string
        }
        Update: {
          access_mode?: Database["public"]["Enums"]["community_access_mode"]
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          price_clp?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          id: string
          message: string | null
          status: Database["public"]["Enums"]["community_join_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["community_join_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["community_join_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["community_member_role"]
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["community_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          author_id: string
          community_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          community_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          community_id: string
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category: string | null
          community_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string | null
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string | null
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      course_community_bans: {
        Row: {
          banned_by: string
          course_id: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by: string
          course_id: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string
          course_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_community_bans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_community_posts: {
        Row: {
          author_id: string
          body: string
          course_id: string
          created_at: string
          id: string
          image_url: string | null
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          course_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_community_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_community_reactions: {
        Row: {
          course_id: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_community_reactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "course_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_community_replies: {
        Row: {
          author_id: string
          body: string
          course_id: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          course_id: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_community_replies_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "course_community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          certificate_enabled: boolean
          certificate_template_url: string | null
          community_enabled: boolean
          community_fee_clp: number
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          duration_minutes_est: number | null
          format: string
          id: string
          instructor_avatar_url: string | null
          instructor_bio: string | null
          instructor_name: string | null
          is_novu_official: boolean
          level: string | null
          price_clp: number
          product_type: string
          redirect_url: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          certificate_enabled?: boolean
          certificate_template_url?: string | null
          community_enabled?: boolean
          community_fee_clp?: number
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_minutes_est?: number | null
          format?: string
          id?: string
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_novu_official?: boolean
          level?: string | null
          price_clp?: number
          product_type?: string
          redirect_url?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          certificate_enabled?: boolean
          certificate_template_url?: string | null
          community_enabled?: boolean
          community_fee_clp?: number
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_minutes_est?: number | null
          format?: string
          id?: string
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_novu_official?: boolean
          level?: string | null
          price_clp?: number
          product_type?: string
          redirect_url?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_2fa_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      creator_availability_rules: {
        Row: {
          created_at: string
          creator_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      creator_availability_settings: {
        Row: {
          buffer_after_min: number
          buffer_before_min: number
          created_at: string
          creator_id: string
          max_days_ahead: number
          min_notice_hours: number
          session_duration_min: number
          timezone: string
          updated_at: string
        }
        Insert: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          creator_id: string
          max_days_ahead?: number
          min_notice_hours?: number
          session_duration_min?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          buffer_after_min?: number
          buffer_before_min?: number
          created_at?: string
          creator_id?: string
          max_days_ahead?: number
          min_notice_hours?: number
          session_duration_min?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_billing_info: {
        Row: {
          address: string | null
          bank_account_holder: string | null
          bank_account_holder_tax_id: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          billing_email: string | null
          business_type: string | null
          city: string | null
          created_at: string
          creator_id: string
          document_type: string | null
          id: string
          legal_name: string | null
          region: string | null
          tax_id: string | null
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_holder_tax_id?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          billing_email?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          creator_id: string
          document_type?: string | null
          id?: string
          legal_name?: string | null
          region?: string | null
          tax_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_holder_tax_id?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          billing_email?: string | null
          business_type?: string | null
          city?: string | null
          created_at?: string
          creator_id?: string
          document_type?: string | null
          id?: string
          legal_name?: string | null
          region?: string | null
          tax_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_billing_info_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_google_accounts: {
        Row: {
          access_token: string
          calendar_id: string
          connected_at: string
          creator_id: string
          expires_at: string
          google_email: string | null
          google_sub: string
          refresh_token: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string
          connected_at?: string
          creator_id: string
          expires_at: string
          google_email?: string | null
          google_sub: string
          refresh_token: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string
          connected_at?: string
          creator_id?: string
          expires_at?: string
          google_email?: string | null
          google_sub?: string
          refresh_token?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_mercadopago_accounts: {
        Row: {
          access_token: string
          connected_at: string
          creator_id: string
          email: string | null
          expires_at: string | null
          live_mode: boolean
          mp_user_id: string
          nickname: string | null
          public_key: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          creator_id: string
          email?: string | null
          expires_at?: string | null
          live_mode?: boolean
          mp_user_id: string
          nickname?: string | null
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          creator_id?: string
          email?: string | null
          expires_at?: string | null
          live_mode?: boolean
          mp_user_id?: string
          nickname?: string | null
          public_key?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creator_reviews: {
        Row: {
          comment: string | null
          created_at: string
          creator_id: string
          id: string
          rating: number
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          creator_id: string
          id?: string
          rating: number
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          rating?: number
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_reviews_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebooks: {
        Row: {
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          file_url: string | null
          id: string
          is_novu_official: boolean
          price_clp: number
          redirect_url: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_novu_official?: boolean
          price_clp?: number
          redirect_url?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_novu_official?: boolean
          price_clp?: number
          redirect_url?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebooks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      enrollments: {
        Row: {
          course_id: string
          id: string
          purchased_at: string
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          id?: string
          purchased_at?: string
          status?: string
          user_id: string
        }
        Update: {
          course_id?: string
          id?: string
          purchased_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_type: string
          id: string
          is_novu_official: boolean
          location: string | null
          max_attendees: number | null
          meeting_url: string | null
          price_clp: number
          redirect_url: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_minutes?: number | null
          event_date: string
          event_type?: string
          id?: string
          is_novu_official?: boolean
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          price_clp?: number
          redirect_url?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_type?: string
          id?: string
          is_novu_official?: boolean
          location?: string | null
          max_attendees?: number | null
          meeting_url?: string | null
          price_clp?: number
          redirect_url?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          enrollment_id: string
          id: string
          lesson_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          enrollment_id: string
          id?: string
          lesson_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          file_name: string
          file_url: string
          id: string
          lesson_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          lesson_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_text: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          module_id: string
          order_index: number
          title: string
          type: string
          video_url: string | null
        }
        Insert: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id: string
          order_index?: number
          title: string
          type?: string
          video_url?: string | null
        }
        Update: {
          content_text?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_resources: {
        Row: {
          course_id: string
          created_at: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          module_id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          module_id: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          module_id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_one_sessions: {
        Row: {
          buffer_after_min: number
          buffer_before_min: number
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          duration_min: number
          id: string
          max_days_ahead: number
          min_notice_hours: number
          price_clp: number
          redirect_url: string | null
          slug: string
          status: string
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          buffer_after_min?: number
          buffer_before_min?: number
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_min?: number
          id?: string
          max_days_ahead?: number
          min_notice_hours?: number
          price_clp?: number
          redirect_url?: string | null
          slug: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          buffer_after_min?: number
          buffer_before_min?: number
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_min?: number
          id?: string
          max_days_ahead?: number
          min_notice_hours?: number
          price_clp?: number
          redirect_url?: string | null
          slug?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_clp: number
          bump_amount_clp: number
          bump_product_id: string | null
          bump_product_type: string | null
          checkout_page_id: string | null
          community_fee_clp: number
          created_at: string
          creator_amount_clp: number
          creator_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          metadata: Json | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_preference_id: string | null
          paid_at: string | null
          platform_amount_clp: number
          product_id: string
          product_type: Database["public"]["Enums"]["order_product_type"]
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_clp: number
          bump_amount_clp?: number
          bump_product_id?: string | null
          bump_product_type?: string | null
          checkout_page_id?: string | null
          community_fee_clp?: number
          created_at?: string
          creator_amount_clp?: number
          creator_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          platform_amount_clp?: number
          product_id: string
          product_type: Database["public"]["Enums"]["order_product_type"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_clp?: number
          bump_amount_clp?: number
          bump_product_id?: string | null
          bump_product_type?: string | null
          checkout_page_id?: string | null
          community_fee_clp?: number
          created_at?: string
          creator_amount_clp?: number
          creator_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          metadata?: Json | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          platform_amount_clp?: number
          product_id?: string
          product_type?: Database["public"]["Enums"]["order_product_type"]
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_checkout_page_id_fkey"
            columns: ["checkout_page_id"]
            isOneToOne: false
            referencedRelation: "checkout_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          ref_id: string
          session_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ref_id: string
          session_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ref_id?: string
          session_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_slug: string | null
          id: string
          interests: string[] | null
          intro_video_url: string | null
          last_2fa_verified_at: string | null
          links: Json | null
          meta_pixel_id: string | null
          name: string | null
          onboarding_completed: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_slug?: string | null
          id: string
          interests?: string[] | null
          intro_video_url?: string | null
          last_2fa_verified_at?: string | null
          links?: Json | null
          meta_pixel_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_slug?: string | null
          id?: string
          interests?: string[] | null
          intro_video_url?: string | null
          last_2fa_verified_at?: string | null
          links?: Json | null
          meta_pixel_id?: string | null
          name?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      session_availability_rules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          session_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          session_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          session_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_availability_rules_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_bookings: {
        Row: {
          cancelled_at: string | null
          created_at: string
          creator_id: string
          end_at: string
          google_event_id: string | null
          guest_email: string | null
          guest_name: string | null
          ics_token: string
          id: string
          meet_url: string | null
          session_id: string
          start_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          end_at: string
          google_event_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          ics_token?: string
          id?: string
          meet_url?: string | null
          session_id: string
          start_at: string
          status?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          end_at?: string
          google_event_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          ics_token?: string
          id?: string
          meet_url?: string | null
          session_id?: string
          start_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_creation_logs: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          students_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          students_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          students_count?: number
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
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_lesson: { Args: { _lesson_id: string }; Returns: boolean }
      can_manage_lesson_module: {
        Args: { _module_id: string }
        Returns: boolean
      }
      creator_has_mercadopago: {
        Args: { _creator_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_booking_by_token: {
        Args: { _id: string; _token: string }
        Returns: {
          end_at: string
          ics_token: string
          id: string
          meet_url: string
          session_description: string
          session_id: string
          session_title: string
          start_at: string
        }[]
      }
      get_course_bans: {
        Args: { _course_id: string }
        Returns: {
          created_at: string
          email: string
          name: string
          user_id: string
        }[]
      }
      get_course_community_feed: {
        Args: { _course_id: string }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          image_url: string
          is_creator: boolean
          my_liked: boolean
          pinned: boolean
          reactions_count: number
          replies_count: number
        }[]
      }
      get_course_community_replies: {
        Args: { _post_id: string }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          is_creator: boolean
        }[]
      }
      get_course_editor_paths: {
        Args: { _course_id: string }
        Returns: {
          lesson_id: string
          resource_file_url: string
          resource_id: string
          video_url: string
        }[]
      }
      get_course_students: {
        Args: { _course_id: string }
        Returns: {
          email: string
          name: string
          purchased_at: string
          status: string
          user_id: string
        }[]
      }
      get_creator_availability: {
        Args: { _creator_id: string }
        Returns: {
          day_of_week: number
          end_time: string
          start_time: string
        }[]
      }
      get_creator_pixel_id: { Args: { _creator_slug: string }; Returns: string }
      get_creator_pixel_id_by_id: {
        Args: { _creator_id: string }
        Returns: string
      }
      get_creator_reviews: {
        Args: { _creator_id: string }
        Returns: {
          comment: string
          created_at: string
          id: string
          rating: number
          reviewer_avatar_url: string
          reviewer_name: string
        }[]
      }
      get_creator_session_bookings: {
        Args: never
        Returns: {
          attendee_email: string
          attendee_name: string
          end_at: string
          id: string
          meet_url: string
          session_id: string
          session_title: string
          start_at: string
          status: string
          user_id: string
        }[]
      }
      get_ebook_file_url: { Args: { _ebook_id: string }; Returns: string }
      get_event_meeting_url: { Args: { _event_id: string }; Returns: string }
      get_event_students: {
        Args: { _event_id: string }
        Returns: {
          email: string
          name: string
          registered_at: string
          status: string
          user_id: string
        }[]
      }
      get_lesson_resource_path_for_owner: {
        Args: { _resource_id: string }
        Returns: string
      }
      get_lesson_video_path_for_owner: {
        Args: { _lesson_id: string }
        Returns: string
      }
      get_my_google_connection: {
        Args: never
        Returns: {
          calendar_id: string
          connected_at: string
          google_email: string
        }[]
      }
      get_my_meta_pixel_id: { Args: never; Returns: string }
      get_my_review_for_creator: {
        Args: { _creator_id: string }
        Returns: {
          comment: string
          created_at: string
          id: string
          rating: number
        }[]
      }
      get_my_session_bookings: {
        Args: never
        Returns: {
          creator_id: string
          creator_name: string
          end_at: string
          ics_token: string
          id: string
          meet_url: string
          session_id: string
          session_title: string
          start_at: string
          status: string
        }[]
      }
      get_order_public: {
        Args: { _order_id: string }
        Returns: {
          amount_clp: number
          creator_id: string
          guest_email: string
          id: string
          is_new_user: boolean
          product_id: string
          product_type: string
          product_url: string
          redirect_url: string
          status: string
        }[]
      }
      get_public_checkout_page: {
        Args: { _creator_slug: string; _page_slug: string }
        Returns: {
          blocks: Json
          bump_description: string
          bump_discount_pct: number
          bump_enabled: boolean
          bump_headline: string
          bump_product_id: string
          bump_product_type: string
          creator_id: string
          id: string
          name: string
          product_id: string
          product_type: string
          slug: string
          theme: Json
        }[]
      }
      get_public_creator_profile: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          bio: string
          creator_slug: string
          id: string
          name: string
        }[]
      }
      get_public_creators_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          avatar_url: string
          bio: string
          creator_slug: string
          id: string
          name: string
        }[]
      }
      get_public_session: {
        Args: { _creator_slug: string; _session_id: string }
        Returns: {
          buffer_after_min: number
          buffer_before_min: number
          cover_url: string
          creator_avatar_url: string
          creator_id: string
          creator_name: string
          creator_slug: string
          description: string
          duration_min: number
          id: string
          max_days_ahead: number
          min_notice_hours: number
          price_clp: number
          timezone: string
          title: string
        }[]
      }
      get_session_availability: {
        Args: { _session_id: string }
        Returns: {
          buffer_after_min: number
          buffer_before_min: number
          duration_min: number
          max_days_ahead: number
          min_notice_hours: number
          rules: Json
          timezone: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_active_enrollment: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_owner: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_banned: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_course_creator: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_creator_2fa_valid: { Args: never; Returns: boolean }
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
      resolve_creator_product: {
        Args: { _creator_slug: string; _product_slug: string }
        Returns: {
          creator_id: string
          product_id: string
          product_slug: string
          product_type: string
        }[]
      }
      slugify: { Args: { _text: string }; Returns: string }
      unban_user_from_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "creator" | "admin"
      community_access_mode: "invite" | "paid"
      community_join_status: "pending" | "approved" | "rejected"
      community_member_role: "owner" | "moderator" | "member"
      order_product_type: "course" | "ebook" | "event" | "community"
      order_status: "pending" | "paid" | "failed" | "refunded"
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
      app_role: ["student", "creator", "admin"],
      community_access_mode: ["invite", "paid"],
      community_join_status: ["pending", "approved", "rejected"],
      community_member_role: ["owner", "moderator", "member"],
      order_product_type: ["course", "ebook", "event", "community"],
      order_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
