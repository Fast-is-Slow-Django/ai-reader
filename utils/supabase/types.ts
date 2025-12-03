/**
 * Supabase 数据库类型定义
 * 
 * 这些类型对应 supabase-schema.sql 中定义的表结构
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_url?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          book_id: string
          cfi_range: string
          selected_text: string
          ai_explanation: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          cfi_range: string
          selected_text: string
          ai_explanation?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          cfi_range?: string
          selected_text?: string
          ai_explanation?: string | null
          color?: string
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

// 类型别名，方便使用
export type Book = Database['public']['Tables']['books']['Row']
export type BookInsert = Database['public']['Tables']['books']['Insert']
export type BookUpdate = Database['public']['Tables']['books']['Update']

export type Note = Database['public']['Tables']['notes']['Row']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']
