import type { Context } from "hono";
import {
  AGNES_API_KEY,
  AGNES_ENDPOINT,
  HAS_AGNES_API_KEY,
} from "../lib/env.js";
import { getAssistantText, isRecord, parseJsonResponse } from "../lib/utils.js";

const VALID_CATEGORIES = new Set([
  "tops",
  "bottoms",
  "dresses",
  "shoes",
  "accessories",
  "outerwear",
  "bags",
]);

function normalizeCategory(value: string) {
  const lower = value.toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower)) return lower;
  if (/top|shirt|tee|blouse|polo/.test(lower)) return "tops";
  if (/bottom|jean|pant|trouser|short|skirt/.test(lower)) return "bottoms";
  if (/dress/.test(lower)) return "dresses";
  if (/shoe|sneaker|boot|sandal|loafer/.test(lower)) return "shoes";
  if (/jacket|coat|blazer|cardigan|outerwear/.test(lower)) return "outerwear";
  if (/bag|tote|clutch/.test(lower)) return "bags";
  if (/accessor|belt|hat|scarf|jewel/.test(lower)) return "accessories";
  return "tops";
}

export async function classifyGarmentRoute(c: Context) {
  try {
    if (!HAS_AGNES_API_KEY) {
      return c.json({ error: "Agnes API key is not configured" }, 500);
    }

    const body: unknown = await c.req.json();
    if (!isRecord(body)) {
      return c.json({ error: "Request body must be a JSON object" }, 400);
    }

    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const itemName = typeof body.name === "string" ? body.name : "Clothing item";

    if (!imageUrl.trim()) {
      return c.json({ error: "imageUrl is required" }, 400);
    }

    const aiResponse = await fetch(AGNES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGNES_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages: [
          {
            role: "system",
            content:
              "You classify clothing items for a wardrobe app. Return valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Classify this garment "${itemName}" into exactly one category:
tops, bottoms, dresses, shoes, accessories, outerwear, or bags.

Return JSON only:
{
  "category": "one of the categories above",
  "label": "short human label such as T-shirt or Jeans"
}`,
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      return c.json(
        { error: "Could not classify garment", details: await aiResponse.text() },
        aiResponse.status as 400,
      );
    }

    const aiData: unknown = await aiResponse.json();
    const rawText = getAssistantText(aiData);
    if (!rawText) {
      return c.json({ error: "No classification returned" }, 502);
    }

    let parsed: unknown;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      return c.json({ error: "Invalid classification response" }, 502);
    }

    const categoryRaw =
      isRecord(parsed) && typeof parsed.category === "string"
        ? parsed.category
        : "tops";
    const label =
      isRecord(parsed) && typeof parsed.label === "string"
        ? parsed.label
        : itemName;

    return c.json({
      category: normalizeCategory(categoryRaw),
      label,
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Garment classification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
