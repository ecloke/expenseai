import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Supabase client for server-side operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Supabase client for client-side operations with auth helpers
 */
export const createSupabaseClient = () => {
  return createClientComponentClient()
}

/**
 * Database types for TypeScript
 */
export interface Database {
  public: {
    Tables: {
      user_configs: {
        Row: {
          id: string
          user_id: string
          telegram_bot_token: string | null
          telegram_bot_username: string | null
          google_sheet_id: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          gemini_api_key: string | null
          sheet_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          google_sheet_id?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          gemini_api_key?: string | null
          sheet_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          google_sheet_id?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          gemini_api_key?: string | null
          sheet_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bot_sessions: {
        Row: {
          id: string
          user_id: string
          bot_username: string
          is_active: boolean
          last_activity: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bot_username: string
          is_active?: boolean
          last_activity?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bot_username?: string
          is_active?: boolean
          last_activity?: string
          created_at?: string
        }
      }
      receipt_logs: {
        Row: {
          id: string
          user_id: string
          store_name: string | null
          total_amount: number | null
          items_count: number | null
          processing_status: 'success' | 'error' | 'partial'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_name?: string | null
          total_amount?: number | null
          items_count?: number | null
          processing_status: 'success' | 'error' | 'partial'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_name?: string | null
          total_amount?: number | null
          items_count?: number | null
          processing_status?: 'success' | 'error' | 'partial'
          error_message?: string | null
          created_at?: string
        }
      }
      chat_logs: {
        Row: {
          id: string
          user_id: string
          user_query: string
          sql_generated: string | null
          ai_response: string | null
          processing_status: 'success' | 'error'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_query: string
          sql_generated?: string | null
          ai_response?: string | null
          processing_status: 'success' | 'error'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_query?: string
          sql_generated?: string | null
          ai_response?: string | null
          processing_status?: 'success' | 'error'
          error_message?: string | null
          created_at?: string
        }
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
  }
}

/**
 * Type helpers
 */
export type UserConfig = Database['public']['Tables']['user_configs']['Row']
export type BotSession = Database['public']['Tables']['bot_sessions']['Row']
export type ReceiptLog = Database['public']['Tables']['receipt_logs']['Row']
export type ChatLog = Database['public']['Tables']['chat_logs']['Row']