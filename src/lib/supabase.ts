import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      ideas: {
        Row: {
          id: string;
          title: string;
          description: string;
          creator_wallet_address: string;
          total_donations: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          creator_wallet_address: string;
          total_donations?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          creator_wallet_address?: string;
          total_donations?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      implementations: {
        Row: {
          id: string;
          idea_id: string;
          url: string;
          label: string;
          description: string;
          citrea_address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          url: string;
          label?: string;
          description?: string;
          citrea_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          url?: string;
          label?: string;
          description?: string;
          citrea_address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      donations: {
        Row: {
          id: string;
          idea_id: string;
          implementation_id: string | null;
          donor_wallet_address: string;
          recipient_address: string;
          amount: number;
          transaction_hash: string;
          status: 'pending' | 'confirmed' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          idea_id: string;
          implementation_id?: string | null;
          donor_wallet_address: string;
          recipient_address: string;
          amount: number;
          transaction_hash: string;
          status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
        Update: {
          id?: string;
          idea_id?: string;
          implementation_id?: string | null;
          donor_wallet_address?: string;
          recipient_address?: string;
          amount?: number;
          transaction_hash?: string;
          status?: 'pending' | 'confirmed' | 'failed';
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          wallet_address: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];