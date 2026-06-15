import "dotenv/config";

export const AGNES_API_KEY = process.env.AGNES_API_KEY;
export const AGNES_ENDPOINT =
  process.env.AGNES_ENDPOINT ||
  "https://apihub.agnes-ai.com/v1/chat/completions";
export const AGNES_IMAGE_ENDPOINT =
  process.env.AGNES_IMAGE_ENDPOINT ||
  "https://apihub.agnes-ai.com/v1/images/generations";
export const HAS_AGNES_API_KEY =
  Boolean(AGNES_API_KEY?.trim()) &&
  AGNES_API_KEY !== "your_new_agnes_api_key_here";

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

const rawSupabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

export const SUPABASE_URL = rawSupabaseUrl
  ? normalizeSupabaseUrl(rawSupabaseUrl)
  : "";

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const API_PORT = Number(process.env.API_PORT || 3001);
