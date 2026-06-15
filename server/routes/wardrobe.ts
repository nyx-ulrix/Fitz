import type { Context } from "hono";
import { requireAuthUserId } from "../lib/requestAuth.js";
import { getUserWardrobeItems } from "../lib/userWardrobe.js";

export async function wardrobeRoute(c: Context) {
  try {
    const auth = await requireAuthUserId(c);
    if (auth.error) return auth.error;

    const items = await getUserWardrobeItems(auth.userId);

    return c.json({
      items,
      sourceNote: "Loaded from your personal wardrobe.",
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Could not load the wardrobe",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
