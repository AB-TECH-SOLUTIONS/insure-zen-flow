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
      attestations_stock: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          serial_end: string
          serial_start: string
          total_count: number
          updated_at: string
          used_count: number
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          serial_end: string
          serial_start: string
          total_count: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          serial_end?: string
          serial_start?: string
          total_count?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "attestations_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: string | null
          payload: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      bordereaux: {
        Row: {
          company_id: string
          created_at: string
          generated_at: string
          generated_by: string | null
          id: string
          pdf_url: string | null
          periode_annee: number
          periode_mois: number
          total_contrats: number
          total_prime_nette: number
          total_prime_ttc: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          periode_annee: number
          periode_mois: number
          total_contrats?: number
          total_prime_nette?: number
          total_prime_ttc?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          pdf_url?: string | null
          periode_annee?: number
          periode_mois?: number
          total_contrats?: number
          total_prime_nette?: number
          total_prime_ttc?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bordereaux_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_company_access: {
        Row: {
          broker_user_id: string
          company_id: string
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          broker_user_id: string
          company_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          broker_user_id?: string
          company_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "broker_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_company_requests: {
        Row: {
          broker_user_id: string
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          document_url: string | null
          id: string
          justification: string | null
          status: Database["public"]["Enums"]["broker_request_status"]
          updated_at: string
        }
        Insert: {
          broker_user_id: string
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          document_url?: string | null
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["broker_request_status"]
          updated_at?: string
        }
        Update: {
          broker_user_id?: string
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          document_url?: string | null
          id?: string
          justification?: string | null
          status?: Database["public"]["Enums"]["broker_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broker_company_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          attachments: Json
          claim_number: string
          client_id: string
          company_id: string
          contract_id: string
          created_at: string
          declared_by: string | null
          description: string | null
          estimated_amount: number | null
          id: string
          occurred_at: string
          settled_amount: number | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
        }
        Insert: {
          attachments?: Json
          claim_number?: string
          client_id: string
          company_id: string
          contract_id: string
          created_at?: string
          declared_by?: string | null
          description?: string | null
          estimated_amount?: number | null
          id?: string
          occurred_at: string
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Update: {
          attachments?: Json
          claim_number?: string
          client_id?: string
          company_id?: string
          contract_id?: string
          created_at?: string
          declared_by?: string | null
          description?: string | null
          estimated_amount?: number | null
          id?: string
          occurred_at?: string
          settled_amount?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          doc_type: string
          extracted: Json
          id: string
          mime_type: string | null
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          doc_type: string
          extracted?: Json
          id?: string
          mime_type?: string | null
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          doc_type?: string
          extracted?: Json
          id?: string
          mime_type?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_user_id: string | null
          company_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          kind: Database["public"]["Enums"]["client_kind"]
          owner_user_id: string | null
          phone: string | null
          profession: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_user_id?: string | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          kind?: Database["public"]["Enums"]["client_kind"]
          owner_user_id?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_user_id?: string | null
          company_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          kind?: Database["public"]["Enums"]["client_kind"]
          owner_user_id?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_reversals: {
        Row: {
          amount: number
          beneficiary_name: string | null
          beneficiary_user_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          paid_at: string | null
          rate: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          beneficiary_name?: string | null
          beneficiary_user_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          rate?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          beneficiary_name?: string | null
          beneficiary_user_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          rate?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_sequences: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_number: number
          product_type: Database["public"]["Enums"]["quote_type"]
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_number?: number
          product_type: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_number?: number
          product_type?: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_sequences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          accessoires: number | null
          acompte_initial: number | null
          attestation_number: string | null
          client_id: string
          commercial_nature: string
          commission_amount: number | null
          commission_rate: number | null
          company_id: string
          contract_number: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          pdf_url: string | null
          prime_brute: number | null
          prime_nette: number | null
          quote_id: string | null
          reduction: number | null
          renewal_status: string
          renewed_from_id: string | null
          source_company: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          total_premium: number
          type: Database["public"]["Enums"]["quote_type"]
          updated_at: string
        }
        Insert: {
          accessoires?: number | null
          acompte_initial?: number | null
          attestation_number?: string | null
          client_id: string
          commercial_nature?: string
          commission_amount?: number | null
          commission_rate?: number | null
          company_id: string
          contract_number: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          pdf_url?: string | null
          prime_brute?: number | null
          prime_nette?: number | null
          quote_id?: string | null
          reduction?: number | null
          renewal_status?: string
          renewed_from_id?: string | null
          source_company?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          total_premium: number
          type: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
        }
        Update: {
          accessoires?: number | null
          acompte_initial?: number | null
          attestation_number?: string | null
          client_id?: string
          commercial_nature?: string
          commission_amount?: number | null
          commission_rate?: number | null
          company_id?: string
          contract_number?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          pdf_url?: string | null
          prime_brute?: number | null
          prime_nette?: number | null
          quote_id?: string | null
          reduction?: number | null
          renewal_status?: string
          renewed_from_id?: string | null
          source_company?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          total_premium?: number
          type?: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_renewed_from_id_fkey"
            columns: ["renewed_from_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          position_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          position_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          related_claim_id: string | null
          related_contract_id: string | null
          related_quote_id: string | null
          sender_id: string
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          related_claim_id?: string | null
          related_contract_id?: string | null
          related_quote_id?: string | null
          sender_id: string
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          related_claim_id?: string | null
          related_contract_id?: string | null
          related_quote_id?: string | null
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          external_reference: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          external_reference?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          external_reference?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          company_id: string
          created_at: string
          department_id: string | null
          id: string
          level: number
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          level?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          primary_company_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          primary_company_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          primary_company_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_company_id_fkey"
            columns: ["primary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          base_premium: number | null
          breakdown: Json
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          duration_days: number | null
          end_date: string | null
          id: string
          manual_mode: boolean
          manual_overrides: Json
          notes: string | null
          payload: Json
          reference: string
          start_date: string | null
          status: Database["public"]["Enums"]["quote_status"]
          taxes: number | null
          total_premium: number | null
          type: Database["public"]["Enums"]["quote_type"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          base_premium?: number | null
          breakdown?: Json
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          manual_mode?: boolean
          manual_overrides?: Json
          notes?: string | null
          payload?: Json
          reference?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          taxes?: number | null
          total_premium?: number | null
          type: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          base_premium?: number | null
          breakdown?: Json
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          end_date?: string | null
          id?: string
          manual_mode?: boolean
          manual_overrides?: Json
          notes?: string | null
          payload?: Json
          reference?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          taxes?: number | null
          total_premium?: number | null
          type?: Database["public"]["Enums"]["quote_type"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_complaints: {
        Row: {
          amount_due: number
          amount_recovered: number
          assigned_to: string | null
          client_id: string | null
          company_id: string
          contract_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_reminder_at: string | null
          note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_recovered?: number
          assigned_to?: string | null
          client_id?: string | null
          company_id: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_reminder_at?: string | null
          note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_recovered?: number
          assigned_to?: string | null
          client_id?: string | null
          company_id?: string
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_reminder_at?: string | null
          note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_objectives: {
        Row: {
          company_id: string
          created_at: string
          id: string
          month: number
          notes: string | null
          product_type: Database["public"]["Enums"]["quote_type"] | null
          target_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          product_type?: Database["public"]["Enums"]["quote_type"] | null
          target_amount?: number
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          product_type?: Database["public"]["Enums"]["quote_type"] | null
          target_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulties: string | null
          due_date: string | null
          id: string
          observations: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          related_claim_id: string | null
          related_client_id: string | null
          related_contract_id: string | null
          related_quote_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulties?: string | null
          due_date?: string | null
          id?: string
          observations?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_claim_id?: string | null
          related_client_id?: string | null
          related_contract_id?: string | null
          related_quote_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulties?: string | null
          due_date?: string | null
          id?: string
          observations?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          related_claim_id?: string | null
          related_client_id?: string | null
          related_contract_id?: string | null
          related_quote_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_claim_id_fkey"
            columns: ["related_claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_contract_id_fkey"
            columns: ["related_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_quote_id_fkey"
            columns: ["related_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          manager_user_id: string | null
          notes: string | null
          position_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          manager_user_id?: string | null
          notes?: string | null
          position_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          manager_user_id?: string | null
          notes?: string | null
          position_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
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
      vehicles: {
        Row: {
          brand: string | null
          category: string | null
          client_id: string
          created_at: string
          energy: string | null
          first_registration_date: string | null
          fiscal_power: number | null
          id: string
          market_value: number | null
          model: string | null
          new_value: number | null
          payload_kg: number | null
          registration: string | null
          seats: number | null
          updated_at: string
          usage: string | null
          vin: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          client_id: string
          created_at?: string
          energy?: string | null
          first_registration_date?: string | null
          fiscal_power?: number | null
          id?: string
          market_value?: number | null
          model?: string | null
          new_value?: number | null
          payload_kg?: number | null
          registration?: string | null
          seats?: number | null
          updated_at?: string
          usage?: string | null
          vin?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          client_id?: string
          created_at?: string
          energy?: string | null
          first_registration_date?: string | null
          fiscal_power?: number | null
          id?: string
          market_value?: number | null
          model?: string | null
          new_value?: number | null
          payload_kg?: number | null
          registration?: string | null
          seats?: number | null
          updated_at?: string
          usage?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_primary_company: { Args: { _user_id: string }; Returns: string }
      get_user_companies: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_contract_number: {
        Args: {
          _company_id: string
          _product: Database["public"]["Enums"]["quote_type"]
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "client"
        | "agent"
        | "courtier"
        | "assureur"
        | "super_admin"
        | "garage"
        | "expert"
        | "hopital"
        | "pharmacie"
        | "autorite"
        | "reassureur"
      broker_request_status: "en_attente" | "acceptee" | "refusee"
      claim_status:
        | "declare"
        | "en_instruction"
        | "expertise"
        | "regle"
        | "refuse"
        | "clos"
      client_kind: "personne_physique" | "personne_morale"
      contract_status: "actif" | "suspendu" | "resilie" | "expire"
      payment_method:
        | "mobile_money_mtn"
        | "mobile_money_orange"
        | "virement"
        | "especes"
        | "cheque"
        | "carte"
      payment_status: "en_attente" | "paye" | "echoue" | "rembourse"
      quote_status: "brouillon" | "envoyee" | "acceptee" | "refusee" | "expiree"
      quote_type: "auto" | "voyage" | "risques_divers"
      task_priority: "low" | "med" | "high"
      task_status: "todo" | "wip" | "done" | "blocked"
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
      app_role: [
        "client",
        "agent",
        "courtier",
        "assureur",
        "super_admin",
        "garage",
        "expert",
        "hopital",
        "pharmacie",
        "autorite",
        "reassureur",
      ],
      broker_request_status: ["en_attente", "acceptee", "refusee"],
      claim_status: [
        "declare",
        "en_instruction",
        "expertise",
        "regle",
        "refuse",
        "clos",
      ],
      client_kind: ["personne_physique", "personne_morale"],
      contract_status: ["actif", "suspendu", "resilie", "expire"],
      payment_method: [
        "mobile_money_mtn",
        "mobile_money_orange",
        "virement",
        "especes",
        "cheque",
        "carte",
      ],
      payment_status: ["en_attente", "paye", "echoue", "rembourse"],
      quote_status: ["brouillon", "envoyee", "acceptee", "refusee", "expiree"],
      quote_type: ["auto", "voyage", "risques_divers"],
      task_priority: ["low", "med", "high"],
      task_status: ["todo", "wip", "done", "blocked"],
    },
  },
} as const
