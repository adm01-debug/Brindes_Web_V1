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
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          banner_url: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          featured_until: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan: Database["public"]["Enums"]["company_plan"]
          rejection_reason: string | null
          slug: string
          state: string | null
          status: Database["public"]["Enums"]["company_status"]
          tagline: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          featured_until?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          rejection_reason?: string | null
          slug: string
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tagline?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          featured_until?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          rejection_reason?: string | null
          slug?: string
          state?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tagline?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      company_reviews: {
        Row: {
          author_id: string
          author_name: string
          comment: string
          company_id: string
          created_at: string
          id: string
          moderation_reason: string | null
          rating: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          comment: string
          company_id: string
          created_at?: string
          id?: string
          moderation_reason?: string | null
          rating: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          comment?: string
          company_id?: string
          created_at?: string
          id?: string
          moderation_reason?: string | null
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_archived_at: string | null
          buyer_id: string
          buyer_muted: boolean
          company_id: string
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          product_id: string | null
          seller_archived_at: string | null
          seller_muted: boolean
          subject: string | null
        }
        Insert: {
          buyer_archived_at?: string | null
          buyer_id: string
          buyer_muted?: boolean
          company_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          seller_archived_at?: string | null
          seller_muted?: boolean
          subject?: string | null
        }
        Update: {
          buyer_archived_at?: string | null
          buyer_id?: string
          buyer_muted?: boolean
          company_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          product_id?: string | null
          seller_archived_at?: string | null
          seller_muted?: boolean
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_items: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          product_id: string
          sort_order: number
          suggested_quantity: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          product_id: string
          sort_order?: number
          suggested_quantity?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          product_id?: string
          sort_order?: number
          suggested_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          created_at: string
          email: string
          id: string
          kind: string
          message: string
          name: string
          phone: string | null
          product_id: string | null
          quantity: number | null
          read_at: string | null
          shipping_address: string | null
          shipping_city: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          id?: string
          kind?: string
          message: string
          name: string
          phone?: string | null
          product_id?: string | null
          quantity?: number | null
          read_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          kind?: string
          message?: string
          name?: string
          phone?: string | null
          product_id?: string | null
          quantity?: number | null
          read_at?: string | null
          shipping_address?: string | null
          shipping_city?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          companies_approved: number
          companies_pending: number
          companies_total: number
          created_at: string
          day: string
          leads_created: number
          product_views: number
          products_approved: number
          products_pending: number
          products_total: number
          updated_at: string
        }
        Insert: {
          companies_approved?: number
          companies_pending?: number
          companies_total?: number
          created_at?: string
          day: string
          leads_created?: number
          product_views?: number
          products_approved?: number
          products_pending?: number
          products_total?: number
          updated_at?: string
        }
        Update: {
          companies_approved?: number
          companies_pending?: number
          companies_total?: number
          created_at?: string
          day?: string
          leads_created?: number
          product_views?: number
          products_approved?: number
          products_pending?: number
          products_total?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          read_at: string | null
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          read_at?: string | null
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asker_name: string
          asker_user_id: string | null
          company_id: string
          created_at: string
          id: string
          product_id: string
          question: string
          status: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_name: string
          asker_user_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          question: string
          status?: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_name?: string
          asker_user_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          name: string
          price_adjustment: number | null
          product_id: string
          sort_order: number
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          name: string
          price_adjustment?: number | null
          product_id: string
          sort_order?: number
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          name?: string
          price_adjustment?: number | null
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          ip_hash: string | null
          product_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          product_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          product_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          colors: string[] | null
          company_id: string
          created_at: string
          currency: string
          customization_options: string | null
          deleted_at: string | null
          description: string | null
          dimensions: string | null
          id: string
          is_active: boolean
          material: string | null
          min_order_quantity: number | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: Database["public"]["Enums"]["product_moderation_status"]
          name: string
          price: number | null
          price_on_request: boolean
          production_time_days: number | null
          search_vector: unknown
          short_description: string | null
          sku: string | null
          slug: string | null
          updated_at: string
          views_count: number
          weight_grams: number | null
        }
        Insert: {
          category_id?: string | null
          colors?: string[] | null
          company_id: string
          created_at?: string
          currency?: string
          customization_options?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          material?: string | null
          min_order_quantity?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: Database["public"]["Enums"]["product_moderation_status"]
          name: string
          price?: number | null
          price_on_request?: boolean
          production_time_days?: number | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          updated_at?: string
          views_count?: number
          weight_grams?: number | null
        }
        Update: {
          category_id?: string | null
          colors?: string[] | null
          company_id?: string
          created_at?: string
          currency?: string
          customization_options?: string | null
          deleted_at?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          is_active?: boolean
          material?: string | null
          min_order_quantity?: number | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: Database["public"]["Enums"]["product_moderation_status"]
          name?: string
          price?: number | null
          price_on_request?: boolean
          production_time_days?: number | null
          search_vector?: unknown
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          updated_at?: string
          views_count?: number
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "mv_company_stats"
            referencedColumns: ["company_id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          subject: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          subject?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          subject?: string | null
        }
        Relationships: []
      }
      storage_cleanup_queue: {
        Row: {
          attempts: number
          bucket: string
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          path: string
        }
        Insert: {
          attempts?: number
          bucket: string
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          path: string
        }
        Update: {
          attempts?: number
          bucket?: string
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          path?: string
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
      web_vitals_daily: {
        Row: {
          day: string
          metric: string
          p75: number | null
          route: string
          samples: number
          updated_at: string
        }
        Insert: {
          day: string
          metric: string
          p75?: number | null
          route: string
          samples?: number
          updated_at?: string
        }
        Update: {
          day?: string
          metric?: string
          p75?: number | null
          route?: string
          samples?: number
          updated_at?: string
        }
        Relationships: []
      }
      web_vitals_events: {
        Row: {
          created_at: string
          id: number
          metric: string
          nav_type: string | null
          rating: string | null
          route: string
          ua_family: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: number
          metric: string
          nav_type?: string | null
          rating?: string | null
          route: string
          ua_family?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: number
          metric?: string
          nav_type?: string | null
          rating?: string | null
          route?: string
          ua_family?: string | null
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      mv_company_stats: {
        Row: {
          company_id: string | null
          leads_30d: number | null
          leads_total: number | null
          products_approved: number | null
          products_total: number | null
          refreshed_at: string | null
          slug: string | null
          total_views: number | null
        }
        Relationships: []
      }
      v_slow_queries: {
        Row: {
          calls: number | null
          max_exec_time: number | null
          mean_exec_time: number | null
          query: string | null
          queryid: number | null
          rows: number | null
          total_exec_time: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      audit_log_purge: { Args: { _older_than_days?: number }; Returns: number }
      compare_suppliers_by_category: {
        Args: { _category_slug: string }
        Returns: {
          avg_rating: number
          city: string
          company_id: string
          featured_until: string
          logo_url: string
          min_price: number
          name: string
          plan: string
          product_count: number
          review_count: number
          slug: string
          state: string
          tagline: string
        }[]
      }
      cron_history_purge: {
        Args: { _older_than_days?: number }
        Returns: number
      }
      extract_storage_path: {
        Args: { _bucket: string; _url: string }
        Returns: string
      }
      get_admin_metrics_range: {
        Args: { _from?: string; _to?: string }
        Returns: {
          companies_approved: number
          companies_pending: number
          companies_total: number
          created_at: string
          day: string
          leads_created: number
          product_views: number
          products_approved: number
          products_pending: number
          products_total: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "metrics_daily"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_company_rating: {
        Args: { _company_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      get_company_stats: {
        Args: { _slug: string }
        Returns: {
          leads_30d: number
          leads_total: number
          products_approved: number
          products_total: number
          refreshed_at: string
          total_views: number
        }[]
      }
      get_cron_health: {
        Args: { _limit?: number }
        Returns: {
          duration_ms: number
          failures_24h: number
          jobname: string
          last_error: string
          last_run_end: string
          last_run_start: string
          last_status: string
          runs_24h: number
          schedule: string
        }[]
      }
      get_security_events: {
        Args: { _from?: string; _limit?: number; _to?: string }
        Returns: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          subject: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "security_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_slow_queries: {
        Args: { _limit?: number }
        Returns: {
          calls: number
          max_exec_time: number
          mean_exec_time: number
          query: string
          queryid: number
          rows: number
          total_exec_time: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      leads_purge: { Args: { _older_than_days?: number }; Returns: number }
      mark_leads_read: { Args: { _ids: string[] }; Returns: number }
      metrics_daily_snapshot:
        | { Args: never; Returns: undefined }
        | { Args: { _day?: string }; Returns: undefined }
      product_views_purge: {
        Args: { _older_than_days?: number }
        Returns: number
      }
      refresh_company_stats: { Args: never; Returns: undefined }
      reset_query_stats: { Args: never; Returns: undefined }
      search_companies: {
        Args: {
          _city?: string
          _page?: number
          _page_size?: number
          _q?: string
          _sort?: string
          _state?: string
        }
        Returns: {
          banner_url: string
          city: string
          created_at: string
          id: string
          logo_url: string
          name: string
          products_count: number
          slug: string
          state: string
          tagline: string
          total_count: number
        }[]
      }
      search_products:
        | {
            Args: {
              _category_slug?: string
              _page?: number
              _page_size?: number
              _price_max?: number
              _price_min?: number
              _q?: string
              _sort?: string
            }
            Returns: {
              category_name: string
              category_slug: string
              company_id: string
              company_name: string
              company_slug: string
              created_at: string
              currency: string
              id: string
              name: string
              price: number
              price_on_request: boolean
              primary_image_url: string
              short_description: string
              slug: string
              total_count: number
              views_count: number
            }[]
          }
        | {
            Args: {
              _category_slug?: string
              _color?: string
              _material?: string
              _max_days?: number
              _max_moq?: number
              _page?: number
              _page_size?: number
              _price_max?: number
              _price_min?: number
              _q?: string
              _sort?: string
              _state?: string
            }
            Returns: {
              category_name: string
              category_slug: string
              company_id: string
              company_name: string
              company_slug: string
              created_at: string
              currency: string
              id: string
              name: string
              price: number
              price_on_request: boolean
              primary_image_url: string
              short_description: string
              slug: string
              total_count: number
              views_count: number
            }[]
          }
      security_events_purge: {
        Args: { _older_than_days?: number }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_conversation: {
        Args: {
          _body: string
          _company_id: string
          _product_id: string
          _subject: string
        }
        Returns: string
      }
      storage_cleanup_enqueue: {
        Args: { _bucket: string; _err?: string; _path: string }
        Returns: undefined
      }
      storage_cleanup_worker: { Args: { _limit?: number }; Returns: number }
      storage_purge_orphans: {
        Args: { _bucket?: string; _limit?: number }
        Returns: number
      }
      strip_dangerous_html: { Args: { input: string }; Returns: string }
      submit_quote_cart: {
        Args: { _customer: Json; _items: Json }
        Returns: Json
      }
      unaccent_safe: { Args: { input: string }; Returns: string }
      web_vitals_rollup: { Args: { _day?: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "company_owner"
      company_plan: "free" | "pro" | "premium"
      company_status: "pending" | "approved" | "rejected" | "suspended"
      product_moderation_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "company_owner"],
      company_plan: ["free", "pro", "premium"],
      company_status: ["pending", "approved", "rejected", "suspended"],
      product_moderation_status: ["pending", "approved", "rejected"],
    },
  },
} as const
