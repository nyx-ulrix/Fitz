import type { Context } from "hono";
import { supabase } from "../lib/supabase.js";
import { resolveItemImage } from "../lib/storage.js";

export async function shopRoute(c: Context) {
  try {
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return c.json(
        { error: "Failed to load marketplace items", details: error },
        500,
      );
    }

    const items = (data ?? [])
      .filter(
        (item) =>
          typeof item.image_url === "string" &&
          item.image_url.trim() &&
          Number.isFinite(Number(item.price)),
      )
      .map(resolveItemImage);

    return c.json({
      items,
      sourceNote: "Products loaded from the Supabase marketplace_items table.",
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Could not load the shop",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
