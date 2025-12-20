import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://myhyntkmbgpjyvpyncdg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15aHludGttYmdwanl2cHluY2RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNjcwMTUsImV4cCI6MjA4MTc0MzAxNX0.GsdLc97gbrL_7qIrzGWrY1pdo2Qpz6NL20v0d-3wdnE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      bbs_entries: {
        Row: {
          id: string;
          category: string;
          title: string;
          content: string;
          author: string;
          date: string;
          image_url: string | null;
          file_name: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bbs_entries']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['bbs_entries']['Insert']>;
      };
      inquiries: {
        Row: {
          id: string;
          title: string;
          content: string;
          date: string;
          status: 'new' | 'read';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inquiries']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>;
      };
      settings: {
        Row: {
          id: number;
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['settings']['Insert']>;
      };
      member_companies: {
        Row: {
          id: string;
          name: string;
          description: string;
          logo_url: string | null;
          website: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['member_companies']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['member_companies']['Insert']>;
      };
      rolling_images: {
        Row: {
          id: number;
          image_url: string;
          subtitle: string;
          title: string;
          button_text: string;
          button_link: string;
          link_type: 'external' | 'internal';
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rolling_images']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['rolling_images']['Insert']>;
      };
    };
  };
}