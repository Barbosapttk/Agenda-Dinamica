import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sdbqqsfgfnqtofdbagdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYnFxc2ZnZm5xdG9mZGJhZ2RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxODQ2NzcsImV4cCI6MjA5Nzc2MDY3N30.imy_ZBDoFYBoufpM_384rZUq0dpQsiDWjpL6HvQpf58';
export const SUPABASE_TABLE = 'agenda_dinamica_storage';

export const supabase = SUPABASE_URL.startsWith('https://') && SUPABASE_URL.includes('.supabase.co')
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;
