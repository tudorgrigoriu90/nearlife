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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      catch_spots: {
        Row: {
          flags: string[]
          habitat: string
          id: string
          kind: string
          lat: number
          lon: number
          name: string | null
          region_id: string
          updated_at: string
        }
        Insert: {
          flags?: string[]
          habitat: string
          id: string
          kind: string
          lat: number
          lon: number
          name?: string | null
          region_id: string
          updated_at?: string
        }
        Update: {
          flags?: string[]
          habitat?: string
          id?: string
          kind?: string
          lat?: number
          lon?: number
          name?: string | null
          region_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catch_spots_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      collection: {
        Row: {
          caught_at: string | null
          created_at: string
          helped_at: string | null
          helped_done_at: string | null
          helped_kind: string | null
          id: string
          prime_bonus: boolean
          species_id: string
          spotted_at: string | null
          user_id: string
        }
        Insert: {
          caught_at?: string | null
          created_at?: string
          helped_at?: string | null
          helped_done_at?: string | null
          helped_kind?: string | null
          id?: string
          prime_bonus?: boolean
          species_id: string
          spotted_at?: string | null
          user_id: string
        }
        Update: {
          caught_at?: string | null
          created_at?: string
          helped_at?: string | null
          helped_done_at?: string | null
          helped_kind?: string | null
          id?: string
          prime_bonus?: boolean
          species_id?: string
          spotted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_species_fk"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          kind: string
          locale: string
          species_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: never
          kind: string
          locale: string
          species_id: string
          user_id?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: never
          kind?: string
          locale?: string
          species_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          active: boolean
          changed_at: string
          entitlement: string
          event_id: string
          product_id: string | null
          user_id: string
        }
        Insert: {
          active: boolean
          changed_at: string
          entitlement: string
          event_id: string
          product_id?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          changed_at?: string
          entitlement?: string
          event_id?: string
          product_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          household_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          household_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          owner_id?: string
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          id: number
          sent_at: string
          species_id: string
          user_id: string
        }
        Insert: {
          id?: never
          sent_at?: string
          species_id: string
          user_id: string
        }
        Update: {
          id?: never
          sent_at?: string
          species_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          free_catch_season: string | null
          free_catches_used: number
          full_game: boolean
          home_region: string | null
          notif_prefs: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          free_catch_season?: string | null
          free_catches_used?: number
          full_game?: boolean
          home_region?: string | null
          notif_prefs?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          free_catch_season?: string | null
          free_catches_used?: number
          full_game?: boolean
          home_region?: string | null
          notif_prefs?: Json
          user_id?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          locale: string | null
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          locale?: string | null
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          locale?: string | null
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recognitions: {
        Row: {
          recognized_at: string
          species_id: string
          user_id: string
        }
        Insert: {
          recognized_at?: string
          species_id: string
          user_id?: string
        }
        Update: {
          recognized_at?: string
          species_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recognitions_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      reviewer_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          label: string
          uses_left: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          label: string
          uses_left: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          label?: string
          uses_left?: number
        }
        Relationships: []
      }
      reviewer_redemptions: {
        Row: {
          code_hash: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_hash: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_redemptions_code_hash_fkey"
            columns: ["code_hash"]
            isOneToOne: false
            referencedRelation: "reviewer_codes"
            referencedColumns: ["code_hash"]
          },
        ]
      }
      species: {
        Row: {
          active_months: number[]
          catch_habitats: string[] | null
          category: string | null
          common_name: string | null
          created_at: string
          gbif_key: number | null
          id: string
          in_catalogue: boolean
          iucn_status: string | null
          legal_status: string | null
          rarity: string
          redlist_se: string | null
          scientific_name: string
          taxon_group: string | null
          vertebrate: boolean | null
        }
        Insert: {
          active_months?: number[]
          catch_habitats?: string[] | null
          category?: string | null
          common_name?: string | null
          created_at?: string
          gbif_key?: number | null
          id: string
          in_catalogue?: boolean
          iucn_status?: string | null
          legal_status?: string | null
          rarity: string
          redlist_se?: string | null
          scientific_name: string
          taxon_group?: string | null
          vertebrate?: boolean | null
        }
        Update: {
          active_months?: number[]
          catch_habitats?: string[] | null
          category?: string | null
          common_name?: string | null
          created_at?: string
          gbif_key?: number | null
          id?: string
          in_catalogue?: boolean
          iucn_status?: string | null
          legal_status?: string | null
          rarity?: string
          redlist_se?: string | null
          scientific_name?: string
          taxon_group?: string | null
          vertebrate?: boolean | null
        }
        Relationships: []
      }
      species_content: {
        Row: {
          always_free: boolean
          common_name: string | null
          created_at: string
          fact: string | null
          fact_origin: string | null
          fact_source_url: string | null
          give: string
          locale: string
          protect: string
          species_id: string
          when_how: string
        }
        Insert: {
          always_free?: boolean
          common_name?: string | null
          created_at?: string
          fact?: string | null
          fact_origin?: string | null
          fact_source_url?: string | null
          give: string
          locale: string
          protect: string
          species_id: string
          when_how: string
        }
        Update: {
          always_free?: boolean
          common_name?: string | null
          created_at?: string
          fact?: string | null
          fact_origin?: string | null
          fact_source_url?: string | null
          give?: string
          locale?: string
          protect?: string
          species_id?: string
          when_how?: string
        }
        Relationships: [
          {
            foreignKeyName: "species_content_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      species_data_bumps: {
        Row: {
          at: string
          id: number
        }
        Insert: {
          at?: string
          id?: never
        }
        Update: {
          at?: string
          id?: never
        }
        Relationships: []
      }
      species_media: {
        Row: {
          author: string | null
          checked_at: string
          license: string | null
          source_url: string | null
          sources_tried: string[]
          species_id: string
          thumb_source: string | null
          thumb_url: string | null
          url: string | null
        }
        Insert: {
          author?: string | null
          checked_at?: string
          license?: string | null
          source_url?: string | null
          sources_tried?: string[]
          species_id: string
          thumb_source?: string | null
          thumb_url?: string | null
          url?: string | null
        }
        Update: {
          author?: string | null
          checked_at?: string
          license?: string | null
          source_url?: string | null
          sources_tried?: string[]
          species_id?: string
          thumb_source?: string | null
          thumb_url?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "species_media_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: true
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      species_presence: {
        Row: {
          active_months: number[]
          created_at: string
          month_counts: number[] | null
          occurrences: number
          region_id: string
          species_id: string
        }
        Insert: {
          active_months?: number[]
          created_at?: string
          month_counts?: number[] | null
          occurrences?: number
          region_id: string
          species_id: string
        }
        Update: {
          active_months?: number[]
          created_at?: string
          month_counts?: number[] | null
          occurrences?: number
          region_id?: string
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "species_presence_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "species_presence_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      species_sounds: {
        Row: {
          author: string | null
          checked_at: string
          license: string | null
          source_url: string | null
          species_id: string
          url: string | null
        }
        Insert: {
          author?: string | null
          checked_at?: string
          license?: string | null
          source_url?: string | null
          species_id: string
          url?: string | null
        }
        Update: {
          author?: string | null
          checked_at?: string
          license?: string | null
          source_url?: string | null
          species_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "species_sounds_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: true
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_retention: { Args: { now_at?: string }; Returns: Json }
      community_impact: {
        Args: never
        Returns: {
          give: number
          helpers: number
          pledges: number
          protect: number
          season: string
        }[]
      }
      community_impact_at: {
        Args: { at: string }
        Returns: {
          give: number
          helpers: number
          pledges: number
          protect: number
          season: string
        }[]
      }
      create_household: { Args: never; Returns: string }
      data_version: { Args: never; Returns: string }
      join_household: { Args: { code: string }; Returns: undefined }
      leave_household: { Args: never; Returns: undefined }
      my_data_export: { Args: never; Returns: Json }
      my_household: { Args: never; Returns: Json }
      new_invite_code: { Args: never; Returns: string }
      notif_prefs_valid: { Args: { p: Json }; Returns: boolean }
      prune_species_data_bumps: { Args: never; Returns: undefined }
      push_cron_secret_matches: {
        Args: { candidate: string }
        Returns: boolean
      }
      push_due_users: {
        Args: {
          allowed_hours: number[]
          at: string
          ignore_slot?: boolean
          min_interval_hours: number
          only_user?: string
        }
        Returns: {
          collected: string[]
          devices: Json
          home_region: string
          prefs: Json
          sent_at: string[]
          user_id: string
        }[]
      }
      push_slot_hour: {
        Args: { allowed_hours: number[]; user_id: string }
        Returns: number
      }
      redeem_reviewer_code: { Args: { p_code: string }; Returns: boolean }
      refresh_full_game: { Args: { p_user: string }; Returns: undefined }
      region_catalogue: {
        Args: { loc: string; region: string }
        Returns: {
          active_months: number[]
          catch_habitats: string[]
          category: string
          common_name: string
          id: string
          iucn_status: string
          legal_status: string
          local_name: string
          month_counts: number[]
          occurrences: number
          photo_author: string
          photo_license: string
          photo_source_url: string
          photo_url: string
          rarity: string
          redlist_se: string
          scientific_name: string
          taxon_group: string
        }[]
      }
      remove_household_member: { Args: { member: string }; Returns: undefined }
      rotate_household_code: { Args: never; Returns: string }
      season_key: { Args: { at: string }; Returns: string }
      set_entitlement: {
        Args: {
          p_active: boolean
          p_at: string
          p_entitlement: string
          p_event: string
          p_product: string
          p_user: string
        }
        Returns: string
      }
      transfer_entitlements: {
        Args: {
          p_at: string
          p_event: string
          p_from: string[]
          p_to: string[]
        }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
