import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Diagnostic log to check if env vars are successfully bundled
console.log('Supabase Init Check:', {
  hasUrl: !!supabaseUrl,
  urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'MISSING',
  hasKey: !!supabaseKey,
  keyPrefix: supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING',
});

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);
