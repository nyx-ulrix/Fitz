import { createClient } from "@supabase/supabase-js";
import { assertSupabaseConfig, supabaseAnonKey, supabaseProjectUrl } from "./supabaseConfig";

assertSupabaseConfig();

export const supabase = createClient(supabaseProjectUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
