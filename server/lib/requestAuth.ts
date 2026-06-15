import type { Context } from "hono";
import { getUserIdFromToken, hasKvAccess } from "./kvStore.js";

export async function requireAuthUserId(c: Context) {
  if (!hasKvAccess()) {
    return {
      error: c.json(
        {
          error: "Server configuration error",
          details:
            "Add SUPABASE_SERVICE_ROLE_KEY to .env and restart the API server.",
        },
        500,
      ),
    };
  }

  const userId = await getUserIdFromToken(c.req.header("Authorization"));
  if (!userId) {
    return {
      error: c.json(
        {
          error: "Unauthorized",
          details: "Sign in and send a valid Authorization bearer token.",
        },
        401,
      ),
    };
  }

  return { userId };
}
