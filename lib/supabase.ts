import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      confessions: {
        Row: {
          id: string;
          type: 'text' | 'poll';
          text: string;
          image: string | null;
          poll_options: any | null;
          timestamp: number;
          reactions: any;
          comments: any[];
          sentiment: string;
          emoji: string;
          tags: string[];
          color_theme: string;
          author_avatar: any;
          is_safe: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'text' | 'poll';
          text: string;
          image?: string | null;
          poll_options?: any | null;
          timestamp: number;
          reactions?: any;
          comments?: any[];
          sentiment: string;
          emoji: string;
          tags: string[];
          color_theme: string;
          author_avatar: any;
          is_safe?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'text' | 'poll';
          text?: string;
          image?: string | null;
          poll_options?: any | null;
          timestamp?: number;
          reactions?: any;
          comments?: any[];
          sentiment?: string;
          emoji?: string;
          tags?: string[];
          color_theme?: string;
          author_avatar?: any;
          is_safe?: boolean;
          created_at?: string;
        };
      };
    };
  };
}