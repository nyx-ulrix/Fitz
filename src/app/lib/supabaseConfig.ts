/** Strip accidental /rest/v1 suffix — Supabase clients need the project base URL only. */
export function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL ?? "",
);

/** Prefer JWT anon key for @supabase/supabase-js auth; fall back to publishable key. */
export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const supabaseProjectUrl = supabaseUrl;

export function isSupabaseConfigured() {
  return Boolean(supabaseProjectUrl && supabaseAnonKey);
}

export function getSupabaseConfigError() {
  if (isSupabaseConfigured()) return null;
  return "Missing VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY). Add them to your environment and redeploy.";
}

/** @deprecated Use isSupabaseConfigured() — does not throw. */
export function assertSupabaseConfig() {
  const error = getSupabaseConfigError();
  if (error) throw new Error(error);
}
