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
      companies: {
        Row: {
          country: string
          created_at: string
          id: string
          industry: string
          name: string
          tier: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          industry: string
          name: string
          tier?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          industry?: string
          name?: string
          tier?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          company_id: string | null
          country: string
          created_at: string
          customer_code: string
          email: string
          full_name: string
          id: string
          lifetime_value: number
          phone: string | null
          segment: string
        }
        Insert: {
          company_id?: string | null
          country?: string
          created_at?: string
          customer_code: string
          email: string
          full_name: string
          id?: string
          lifetime_value?: number
          phone?: string | null
          segment?: string
        }
        Update: {
          company_id?: string | null
          country?: string
          created_at?: string
          customer_code?: string
          email?: string
          full_name?: string
          id?: string
          lifetime_value?: number
          phone?: string | null
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          department: string
          email: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          department?: string
          email: string
          full_name: string
          id?: string
          role?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          customer_id: string
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          order_id: string | null
          paid_at: string | null
          status: string
          tax_amount: number
        }
        Insert: {
          amount: number
          customer_id: string
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          tax_amount?: number
        }
        Update: {
          amount?: number
          customer_id?: string
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string | null
          paid_at?: string | null
          status?: string
          tax_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          line_total: number
          order_id: string
          product_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel: string
          created_at: string
          currency: string
          customer_id: string
          delivered_at: string | null
          id: string
          order_number: string
          placed_at: string
          promised_delivery_at: string | null
          status: string
          total_amount: number
        }
        Insert: {
          channel?: string
          created_at?: string
          currency?: string
          customer_id: string
          delivered_at?: string | null
          id?: string
          order_number: string
          placed_at?: string
          promised_delivery_at?: string | null
          status?: string
          total_amount?: number
        }
        Update: {
          channel?: string
          created_at?: string
          currency?: string
          customer_id?: string
          delivered_at?: string | null
          id?: string
          order_number?: string
          placed_at?: string
          promised_delivery_at?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          customer_id: string
          id: string
          invoice_id: string | null
          method: string
          paid_at: string
          status: string
        }
        Insert: {
          amount: number
          customer_id: string
          id?: string
          invoice_id?: string | null
          method?: string
          paid_at?: string
          status?: string
        }
        Update: {
          amount?: number
          customer_id?: string
          id?: string
          invoice_id?: string | null
          method?: string
          paid_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sku: string
          stock_qty: number
          unit_price: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          sku: string
          stock_qty?: number
          unit_price: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sku?: string
          stock_qty?: number
          unit_price?: number
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string
          delay_days: number
          delay_reason: string | null
          delivered_at: string | null
          estimated_delivery_at: string | null
          id: string
          last_scan_location: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string
        }
        Insert: {
          carrier: string
          delay_days?: number
          delay_reason?: string | null
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          last_scan_location?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number: string
        }
        Update: {
          carrier?: string
          delay_days?: number
          delay_reason?: string | null
          delivered_at?: string | null
          estimated_delivery_at?: string | null
          id?: string
          last_scan_location?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          body: string
          category: string
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          priority: string
          resolved_at: string | null
          sentiment: string
          status: string
          subject: string
          ticket_number: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          sentiment?: string
          status?: string
          subject: string
          ticket_number: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          sentiment?: string
          status?: string
          subject?: string
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
