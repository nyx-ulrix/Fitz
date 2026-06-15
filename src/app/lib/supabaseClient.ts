import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseProjectUrl } from "./supabaseConfig";

export const supabase = createClient(
  supabaseProjectUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for this deployment.");
  }
  return supabase;
}
