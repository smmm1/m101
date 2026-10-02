import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Diagnostic log to check if env vars are successfully bundled by Vite on Vercel
console.log('Supabase Init Check:', {
  hasUrl: !!supabaseUrl,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'MISSING',
  hasKey: !!supabaseAnonKey,
  keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + '...' : 'MISSING',
});

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
