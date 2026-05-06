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
      am_master: {
        Row: {
          annual_target: number
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          annual_target?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
        }
        Update: {
          annual_target?: number
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json
          target_label: string
          target_type: string
          type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_label: string
          target_type: string
          type: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_label?: string
          target_type?: string
          type?: string
        }
        Relationships: []
      }
      batch_metadata: {
        Row: {
          latest_batch: number
          table_id: string
          updated_at: string | null
        }
        Insert: {
          latest_batch?: number
          table_id: string
          updated_at?: string | null
        }
        Update: {
          latest_batch?: number
          table_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      business_rules: {
        Row: {
          id: number
          rules: Json
          updated_at: string
        }
        Insert: {
          id?: number
          rules: Json
          updated_at?: string
        }
        Update: {
          id?: number
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      category_targets: {
        Row: {
          category: string
          id: number
          target: number
          updated_at: string
        }
        Insert: {
          category: string
          id?: number
          target?: number
          updated_at?: string
        }
        Update: {
          category?: string
          id?: number
          target?: number
          updated_at?: string
        }
        Relationships: []
      }
      pm_master: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_targets: {
        Row: {
          account_manager: string | null
          aging_invoice: number | null
          batch_number: number | null
          category: string | null
          category_note: string | null
          client_po_date: string | null
          company_name: string | null
          count_target_change: number | null
          created_at: string
          customer: string | null
          gp_acc: number | null
          group_am: string | null
          history_update_target_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_status: string | null
          is_contract: string | null
          is_po: string | null
          last_update: string | null
          net_profit_project: number | null
          npp_actual: number | null
          payment_date: string | null
          project_category: string | null
          project_id: string | null
          project_manager: string | null
          project_name: string | null
          project_tracking: string | null
          reason_update: string | null
          status: string | null
          target_date: string | null
          target_id: number | null
          target_invoice_r0: string | null
          term_of_payment_sales: string | null
          total: number | null
          upload_date: string | null
        }
        Insert: {
          account_manager?: string | null
          aging_invoice?: number | null
          batch_number?: number | null
          category?: string | null
          category_note?: string | null
          client_po_date?: string | null
          company_name?: string | null
          count_target_change?: number | null
          created_at?: string
          customer?: string | null
          gp_acc?: number | null
          group_am?: string | null
          history_update_target_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_status?: string | null
          is_contract?: string | null
          is_po?: string | null
          last_update?: string | null
          net_profit_project?: number | null
          npp_actual?: number | null
          payment_date?: string | null
          project_category?: string | null
          project_id?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_tracking?: string | null
          reason_update?: string | null
          status?: string | null
          target_date?: string | null
          target_id?: number | null
          target_invoice_r0?: string | null
          term_of_payment_sales?: string | null
          total?: number | null
          upload_date?: string | null
        }
        Update: {
          account_manager?: string | null
          aging_invoice?: number | null
          batch_number?: number | null
          category?: string | null
          category_note?: string | null
          client_po_date?: string | null
          company_name?: string | null
          count_target_change?: number | null
          created_at?: string
          customer?: string | null
          gp_acc?: number | null
          group_am?: string | null
          history_update_target_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_status?: string | null
          is_contract?: string | null
          is_po?: string | null
          last_update?: string | null
          net_profit_project?: number | null
          npp_actual?: number | null
          payment_date?: string | null
          project_category?: string | null
          project_id?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_tracking?: string | null
          reason_update?: string | null
          status?: string | null
          target_date?: string | null
          target_id?: number | null
          target_invoice_r0?: string | null
          term_of_payment_sales?: string | null
          total?: number | null
          upload_date?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          account_manager: string | null
          actual_golive_date: string | null
          actual_warranty_end_date: string | null
          batch_number: number | null
          budget_by_progress: number | null
          budget_usage: number | null
          category: string | null
          category_note: string | null
          client_po_date: string | null
          contract_date: string | null
          created_at: string
          current_stage: string | null
          customer: string | null
          financial_health: string | null
          first_issued_date: string | null
          golive_date: string | null
          gp_3hw: number | null
          gp_3sv: number | null
          gp_3sw: number | null
          gp_need_invoice_as_june_2020: number | null
          gp_osl: number | null
          gp_osv_nonosl: number | null
          gp_osv_osl: number | null
          gross_profit: number | null
          id: string
          main_delivery_team: string | null
          maintenance_end_date: string | null
          modified_date: string | null
          npp: number | null
          npp_actual: number | null
          pcs_status: string | null
          percentage_progress: number | null
          pqi: number | null
          pqi_cost: number | null
          pqi_cost_r_0: number | null
          pqi_r0: number | null
          pqi_time: number | null
          pqi_time_r_0: number | null
          progress_date: string | null
          progress_note: string | null
          project_category: string | null
          project_end_date: string | null
          project_id: string | null
          project_manager: string | null
          project_name: string | null
          project_reference: string | null
          project_start_date: string | null
          sales_3hw: number | null
          sales_3sv: number | null
          sales_3sw: number | null
          sales_need_invoice_as_june_2020: number | null
          sales_osl: number | null
          sales_osv_nonosl: number | null
          sales_osv_osl: number | null
          schedule_health: string | null
          total_budget: number | null
          total_sales: number | null
          upload_date: string | null
          variance_budget_usage: number | null
          warranty_end_date: string | null
        }
        Insert: {
          account_manager?: string | null
          actual_golive_date?: string | null
          actual_warranty_end_date?: string | null
          batch_number?: number | null
          budget_by_progress?: number | null
          budget_usage?: number | null
          category?: string | null
          category_note?: string | null
          client_po_date?: string | null
          contract_date?: string | null
          created_at?: string
          current_stage?: string | null
          customer?: string | null
          financial_health?: string | null
          first_issued_date?: string | null
          golive_date?: string | null
          gp_3hw?: number | null
          gp_3sv?: number | null
          gp_3sw?: number | null
          gp_need_invoice_as_june_2020?: number | null
          gp_osl?: number | null
          gp_osv_nonosl?: number | null
          gp_osv_osl?: number | null
          gross_profit?: number | null
          id?: string
          main_delivery_team?: string | null
          maintenance_end_date?: string | null
          modified_date?: string | null
          npp?: number | null
          npp_actual?: number | null
          pcs_status?: string | null
          percentage_progress?: number | null
          pqi?: number | null
          pqi_cost?: number | null
          pqi_cost_r_0?: number | null
          pqi_r0?: number | null
          pqi_time?: number | null
          pqi_time_r_0?: number | null
          progress_date?: string | null
          progress_note?: string | null
          project_category?: string | null
          project_end_date?: string | null
          project_id?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_reference?: string | null
          project_start_date?: string | null
          sales_3hw?: number | null
          sales_3sv?: number | null
          sales_3sw?: number | null
          sales_need_invoice_as_june_2020?: number | null
          sales_osl?: number | null
          sales_osv_nonosl?: number | null
          sales_osv_osl?: number | null
          schedule_health?: string | null
          total_budget?: number | null
          total_sales?: number | null
          upload_date?: string | null
          variance_budget_usage?: number | null
          warranty_end_date?: string | null
        }
        Update: {
          account_manager?: string | null
          actual_golive_date?: string | null
          actual_warranty_end_date?: string | null
          batch_number?: number | null
          budget_by_progress?: number | null
          budget_usage?: number | null
          category?: string | null
          category_note?: string | null
          client_po_date?: string | null
          contract_date?: string | null
          created_at?: string
          current_stage?: string | null
          customer?: string | null
          financial_health?: string | null
          first_issued_date?: string | null
          golive_date?: string | null
          gp_3hw?: number | null
          gp_3sv?: number | null
          gp_3sw?: number | null
          gp_need_invoice_as_june_2020?: number | null
          gp_osl?: number | null
          gp_osv_nonosl?: number | null
          gp_osv_osl?: number | null
          gross_profit?: number | null
          id?: string
          main_delivery_team?: string | null
          maintenance_end_date?: string | null
          modified_date?: string | null
          npp?: number | null
          npp_actual?: number | null
          pcs_status?: string | null
          percentage_progress?: number | null
          pqi?: number | null
          pqi_cost?: number | null
          pqi_cost_r_0?: number | null
          pqi_r0?: number | null
          pqi_time?: number | null
          pqi_time_r_0?: number | null
          progress_date?: string | null
          progress_note?: string | null
          project_category?: string | null
          project_end_date?: string | null
          project_id?: string | null
          project_manager?: string | null
          project_name?: string | null
          project_reference?: string | null
          project_start_date?: string | null
          sales_3hw?: number | null
          sales_3sv?: number | null
          sales_3sw?: number | null
          sales_need_invoice_as_june_2020?: number | null
          sales_osl?: number | null
          sales_osv_nonosl?: number | null
          sales_osv_osl?: number | null
          schedule_health?: string | null
          total_budget?: number | null
          total_sales?: number | null
          upload_date?: string | null
          variance_budget_usage?: number | null
          warranty_end_date?: string | null
        }
        Relationships: []
      }
      prospects: {
        Row: {
          am_name: string | null
          amount: number | null
          amount_cl: number | null
          batch_number: number | null
          category: string | null
          category_note: string | null
          client_name: string | null
          company_name: string | null
          confidence_level: number | null
          created_at: string
          directorat: string | null
          est_prospect_close_date: string | null
          gp: number | null
          gp_cl: number | null
          group_name: string | null
          id: string
          id_project: string | null
          id_prospect_status: number | null
          id_top_sales: number | null
          opr_del: number | null
          osv_non_osl: number | null
          prospect_name: string | null
          status: string | null
          target_date: string | null
          term_of_payment: string | null
          upload_date: string | null
        }
        Insert: {
          am_name?: string | null
          amount?: number | null
          amount_cl?: number | null
          batch_number?: number | null
          category?: string | null
          category_note?: string | null
          client_name?: string | null
          company_name?: string | null
          confidence_level?: number | null
          created_at?: string
          directorat?: string | null
          est_prospect_close_date?: string | null
          gp?: number | null
          gp_cl?: number | null
          group_name?: string | null
          id?: string
          id_project?: string | null
          id_prospect_status?: number | null
          id_top_sales?: number | null
          opr_del?: number | null
          osv_non_osl?: number | null
          prospect_name?: string | null
          status?: string | null
          target_date?: string | null
          term_of_payment?: string | null
          upload_date?: string | null
        }
        Update: {
          am_name?: string | null
          amount?: number | null
          amount_cl?: number | null
          batch_number?: number | null
          category?: string | null
          category_note?: string | null
          client_name?: string | null
          company_name?: string | null
          confidence_level?: number | null
          created_at?: string
          directorat?: string | null
          est_prospect_close_date?: string | null
          gp?: number | null
          gp_cl?: number | null
          group_name?: string | null
          id?: string
          id_project?: string | null
          id_prospect_status?: number | null
          id_top_sales?: number | null
          opr_del?: number | null
          osv_non_osl?: number | null
          prospect_name?: string | null
          status?: string | null
          target_date?: string | null
          term_of_payment?: string | null
          upload_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_backlog_subtotals: {
        Args: {
          p_batch_number: number
          p_category_filter?: string
          p_end_date?: string
          p_invoice_date_empty?: boolean
          p_search_query?: string
          p_start_date?: string
        }
        Returns: {
          sum_gp_acc: number
          sum_total: number
        }[]
      }
      get_dashboard_summary: {
        Args: never
        Returns: {
          am_achievement_data: Json
          avg_pqi_cost: number
          avg_pqi_time: number
          avg_progress: number
          budget_data: Json
          cat_data: Json
          fin_data: Json
          pm_data: Json
          pqi_cost_data: Json
          pqi_time_data: Json
          progress_data: Json
          sched_data: Json
          total: number
          total_gross_profit: number
        }[]
      }
      get_latest_batch: { Args: { p_table_id: string }; Returns: number }
      get_my_role: { Args: never; Returns: string }
      get_prospects_subtotals: {
        Args: {
          p_batch_number: number
          p_category_filter?: string
          p_end_date?: string
          p_search_query?: string
          p_start_date?: string
        }
        Returns: {
          sum_amount: number
          sum_gp: number
        }[]
      }
      get_sales_performance_summary:
        | {
            Args: never
            Returns: {
              achievement_percent: number
              backlog_actual: number
              backlog_target: number
              prospect_pipeline: number
              sales_person: string
              total_opportunity: number
            }[]
          }
        | {
            Args: { p_end_date?: string; p_start_date?: string }
            Returns: {
              achievement_percent: number
              am_target: number
              backlog: number
              prospect_pipeline: number
              sales_person: string
              total_opportunity: number
            }[]
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
