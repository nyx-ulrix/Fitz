import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./env.js";

export const KV_TABLE = "kv_store_09284421";

const adminClient =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const authClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export function hasKvAccess() {
  return Boolean(adminClient);
}

export async function getUserIdFromToken(
  authHeader: string | null | undefined,
): Promise<string | null> {
  if (!authClient || !authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function getKvByPrefix(prefix: string): Promise<unknown[]> {
  if (!adminClient) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the API server.",
    );
  }
  const { data, error } = await adminClient
    .from(KV_TABLE)
    .select("value")
    .like("key", `${prefix}%`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.value);
}
