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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          agent_id: string
          assistant_id: string
          created_at: string | null
          id: string
          product_id: string | null
          status: string | null
          web_url: string | null
        }
        Insert: {
          agent_id: string
          assistant_id: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          web_url?: string | null
        }
        Update: {
          agent_id?: string
          assistant_id?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          status?: string | null
          web_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_config: {
        Row: {
          bot_active: boolean | null
          character: string | null
          created_at: string | null
          id: number
          is_enabled: boolean | null
          model: string | null
          personality: string | null
          system_prompt: string | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          bot_active?: boolean | null
          character?: string | null
          created_at?: string | null
          id: number
          is_enabled?: boolean | null
          model?: string | null
          personality?: string | null
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          bot_active?: boolean | null
          character?: string | null
          created_at?: string | null
          id?: number
          is_enabled?: boolean | null
          model?: string | null
          personality?: string | null
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bot_personality: {
        Row: {
          id: number
          personality_text: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          personality_text: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          personality_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      call_history: {
        Row: {
          duration_minutes: number | null
          id: string
          number: string | null
          timestamp: string | null
          topic: string | null
          type: string | null
        }
        Insert: {
          duration_minutes?: number | null
          id?: string
          number?: string | null
          timestamp?: string | null
          topic?: string | null
          type?: string | null
        }
        Update: {
          duration_minutes?: number | null
          id?: string
          number?: string | null
          timestamp?: string | null
          topic?: string | null
          type?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string | null
          facebook_n8n_webhook_url: string | null
          id: string
          instagram_n8n_webhook_url: string | null
          phone_number: string | null
          telegram_n8n_webhook_url: string | null
          updated_at: string | null
          vapi_assistant_id: string | null
          vapi_public_key: string | null
          vapi_widget_code: string | null
          whatsapp_n8n_webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          facebook_n8n_webhook_url?: string | null
          id?: string
          instagram_n8n_webhook_url?: string | null
          phone_number?: string | null
          telegram_n8n_webhook_url?: string | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_public_key?: string | null
          vapi_widget_code?: string | null
          whatsapp_n8n_webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          facebook_n8n_webhook_url?: string | null
          id?: string
          instagram_n8n_webhook_url?: string | null
          phone_number?: string | null
          telegram_n8n_webhook_url?: string | null
          updated_at?: string | null
          vapi_assistant_id?: string | null
          vapi_public_key?: string | null
          vapi_widget_code?: string | null
          whatsapp_n8n_webhook_url?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          end_time: string | null
          id: string
          platform: string | null
          start_time: string | null
          summary: string | null
        }
        Insert: {
          end_time?: string | null
          id?: string
          platform?: string | null
          start_time?: string | null
          summary?: string | null
        }
        Update: {
          end_time?: string | null
          id?: string
          platform?: string | null
          start_time?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          assistant_id: string
          call_id: string
          duration: number | null
          id: string
          outcome: string | null
          product_id: string | null
          timestamp: string | null
          transcript: string | null
        }
        Insert: {
          assistant_id: string
          call_id: string
          duration?: number | null
          id?: string
          outcome?: string | null
          product_id?: string | null
          timestamp?: string | null
          transcript?: string | null
        }
        Update: {
          assistant_id?: string
          call_id?: string
          duration?: number | null
          id?: string
          outcome?: string | null
          product_id?: string | null
          timestamp?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customizations: {
        Row: {
          assistant_personality: string | null
          background_image_url: string | null
          business_description: string | null
          business_hours: string | null
          business_industry: string | null
          business_name: string | null
          chat_logo_url: string | null
          created_at: string | null
          custom_voices: Json | null
          facebook_username: string | null
          faqs: Json | null
          greeting: string | null
          id: string
          instagram_username: string | null
          key_services: string | null
          logo_url: string | null
          setup_strength: string | null
          special_instructions: string | null
          target_audience: string | null
          telegram_username: string | null
          tone: string | null
          updated_at: string | null
          vapi_voices: Json | null
          voices: Json | null
          whatsapp_username: string | null
        }
        Insert: {
          assistant_personality?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_industry?: string | null
          business_name?: string | null
          chat_logo_url?: string | null
          created_at?: string | null
          custom_voices?: Json | null
          facebook_username?: string | null
          faqs?: Json | null
          greeting?: string | null
          id?: string
          instagram_username?: string | null
          key_services?: string | null
          logo_url?: string | null
          setup_strength?: string | null
          special_instructions?: string | null
          target_audience?: string | null
          telegram_username?: string | null
          tone?: string | null
          updated_at?: string | null
          vapi_voices?: Json | null
          voices?: Json | null
          whatsapp_username?: string | null
        }
        Update: {
          assistant_personality?: string | null
          background_image_url?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_industry?: string | null
          business_name?: string | null
          chat_logo_url?: string | null
          created_at?: string | null
          custom_voices?: Json | null
          facebook_username?: string | null
          faqs?: Json | null
          greeting?: string | null
          id?: string
          instagram_username?: string | null
          key_services?: string | null
          logo_url?: string | null
          setup_strength?: string | null
          special_instructions?: string | null
          target_audience?: string | null
          telegram_username?: string | null
          tone?: string | null
          updated_at?: string | null
          vapi_voices?: Json | null
          voices?: Json | null
          whatsapp_username?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          id: string
          platform: string | null
          role: string | null
          timestamp: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          id?: string
          platform?: string | null
          role?: string | null
          timestamp?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          id?: string
          platform?: string | null
          role?: string | null
          timestamp?: string | null
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
      product_media: {
        Row: {
          assistant_id: string
          created_at: string | null
          description: string | null
          id: string
          label: string
          media_type: string
          media_url: string
          product_id: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          media_type: string
          media_url: string
          product_id?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          media_type?: string
          media_url?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          image_url: string | null
          link_slug: string
          name: string
          price: number | null
          sales_instructions: string | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          link_slug: string
          name: string
          price?: number | null
          sales_instructions?: string | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          link_slug?: string
          name?: string
          price?: number | null
          sales_instructions?: string | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number | null
          conversation_id: string | null
          description: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          amount?: number | null
          conversation_id?: string | null
          description?: string | null
          id?: string
          timestamp?: string | null
        }
        Update: {
          amount?: number | null
          conversation_id?: string | null
          description?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      toggles: {
        Row: {
          created_at: string | null
          facebook_on: boolean | null
          id: string
          instagram_on: boolean | null
          master_switch: boolean | null
          telegram_on: boolean | null
          updated_at: string | null
          whatsapp_on: boolean | null
        }
        Insert: {
          created_at?: string | null
          facebook_on?: boolean | null
          id?: string
          instagram_on?: boolean | null
          master_switch?: boolean | null
          telegram_on?: boolean | null
          updated_at?: string | null
          whatsapp_on?: boolean | null
        }
        Update: {
          created_at?: string | null
          facebook_on?: boolean | null
          id?: string
          instagram_on?: boolean | null
          master_switch?: boolean | null
          telegram_on?: boolean | null
          updated_at?: string | null
          whatsapp_on?: boolean | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          caller_info: string | null
          conversation_id: string | null
          id: string
          sales_flagged: boolean | null
          timestamp: string | null
          transcript_text: string | null
        }
        Insert: {
          caller_info?: string | null
          conversation_id?: string | null
          id?: string
          sales_flagged?: boolean | null
          timestamp?: string | null
          transcript_text?: string | null
        }
        Update: {
          caller_info?: string | null
          conversation_id?: string | null
          id?: string
          sales_flagged?: boolean | null
          timestamp?: string | null
          transcript_text?: string | null
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet: {
        Row: {
          created_at: string | null
          history: Json | null
          id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          history?: Json | null
          id?: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          history?: Json | null
          id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          id: number
          message_text: string
          sender_type: string
          timestamp: string | null
          user_phone: string
        }
        Insert: {
          id?: number
          message_text: string
          sender_type: string
          timestamp?: string | null
          user_phone: string
        }
        Update: {
          id?: number
          message_text?: string
          sender_type?: string
          timestamp?: string | null
          user_phone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
