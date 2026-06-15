import type { Context } from "hono";
import { supabase } from "../lib/supabase.js";
import { resolveItemImage } from "../lib/storage.js";
import {
  AGNES_API_KEY,
  AGNES_ENDPOINT,
  HAS_AGNES_API_KEY,
} from "../lib/env.js";
import { requireAuthUserId } from "../lib/requestAuth.js";
import { getUserWardrobeItems } from "../lib/userWardrobe.js";
import {
  getGarmentType,
  outfitHasTopAndBottom,
  sortItemIdsByGarmentType,
  summarizeWardrobe,
} from "../lib/garmentType.js";
import { getStringArray, isRecord, parseJsonResponse } from "../lib/utils.js";

const AGNES_TIMEOUT_MS = 50_000;

function slimWardrobeItem(item: Record<string, unknown>) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    garmentType: getGarmentType(item),
    color: item.color ?? item.colour,
  };
}

async function askAgnesForOutfits(prompt: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGNES_TIMEOUT_MS);

  try {
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
              "You are a fashion stylist API. Always return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API request failed (${aiResponse.status})`);
    }

    const aiData: unknown = await aiResponse.json();
    const rawText =
      isRecord(aiData) &&
      Array.isArray(aiData.choices) &&
      isRecord(aiData.choices[0]) &&
      isRecord(aiData.choices[0].message) &&
      typeof aiData.choices[0].message.content === "string"
        ? aiData.choices[0].message.content
        : undefined;

    if (!rawText) {
      throw new Error("No response from AI");
    }

    return parseJsonResponse(rawText);
  } finally {
    clearTimeout(timer);
  }
}

function pickItemIdByCategory(
  category: "top" | "bottom",
  items: Record<string, unknown>[],
  excludeIds: Set<string>,
) {
  const match = items.find((item) => {
    if (typeof item.id !== "string" || excludeIds.has(item.id)) return false;
    return getGarmentType(item) === category;
  });
  return typeof match?.id === "string" ? match.id : null;
}

function removeDuplicateCoreItems(
  itemIds: string[],
  items: Record<string, unknown>[],
) {
  const itemById = new Map(
    items
      .filter((item) => typeof item.id === "string")
      .map((item) => [item.id as string, item]),
  );
  const usedCategories = new Set<string>();

  return itemIds.filter((id) => {
    const item = itemById.get(id);
    if (!item) return false;

    const type = getGarmentType(item);
    if (!["top", "bottom", "shoes"].includes(type)) return true;
    if (usedCategories.has(type)) return false;

    usedCategories.add(type);
    return true;
  });
}

function synthesizeOutfits(
  wardrobeItems: Record<string, unknown>[],
  count = 2,
) {
  const tops = wardrobeItems.filter((item) => getGarmentType(item) === "top");
  const bottoms = wardrobeItems.filter(
    (item) => getGarmentType(item) === "bottom",
  );
  const dresses = wardrobeItems.filter(
    (item) => getGarmentType(item) === "dress",
  );
  const shoes = wardrobeItems.filter(
    (item) => getGarmentType(item) === "shoes",
  );

  const outfits: Record<string, unknown>[] = [];

  if (dresses.length > 0) {
    for (let i = 0; i < Math.min(count, dresses.length); i += 1) {
      const dress = dresses[i];
      const shoe = shoes[i % Math.max(shoes.length, 1)];
      const ownedItemIds =
        shoes.length > 0 && typeof shoe?.id === "string"
          ? [dress.id as string, shoe.id as string]
          : [dress.id as string];
      outfits.push({
        name: `Dress look ${i + 1}`,
        ownedItemIds,
        shopItemIds: [],
        totalShopPrice: 0,
        reason:
          "Built from your wardrobe with a dress as the main piece, plus shoes when available.",
        occasionFit: "Medium",
        weatherFit: "Medium",
        styleNotes: "Wardrobe-balanced",
      });
    }
  }

  if (tops.length > 0 && bottoms.length > 0) {
    const remaining = Math.max(count - outfits.length, 1);
    for (let i = 0; i < remaining; i += 1) {
      const top = tops[i % tops.length];
      const bottom = bottoms[i % bottoms.length];
      const shoe = shoes.length > 0 ? shoes[i % shoes.length] : null;
      const ownedItemIds = [
        top.id as string,
        bottom.id as string,
        ...(shoe && typeof shoe.id === "string" ? [shoe.id] : []),
      ];
      outfits.push({
        name: `Everyday look ${i + 1}`,
        ownedItemIds,
        shopItemIds: [],
        totalShopPrice: 0,
        reason:
          "Built from your wardrobe with one top and one bottom so the outfit is complete.",
        occasionFit: "Medium",
        weatherFit: "Medium",
        styleNotes: "Wardrobe-balanced",
      });
    }
  }

  return outfits.slice(0, count);
}

function ensureTopAndBottom(
  ownedItemIds: string[],
  shopItemIds: string[],
  wardrobeItems: Record<string, unknown>[],
  marketplaceItems: Record<string, unknown>[],
  shopTheLook: boolean,
  budget: number,
) {
  const wardrobeById = new Map(
    wardrobeItems
      .filter((item) => typeof item.id === "string")
      .map((item) => [item.id as string, item]),
  );
  const marketplaceById = new Map(
    marketplaceItems
      .filter((item) => typeof item.id === "string")
      .map((item) => [item.id as string, item]),
  );
  const allItemsById = new Map([...wardrobeById, ...marketplaceById]);

  let owned = [...ownedItemIds];
  let shop = [...shopItemIds];
  const usedIds = () => new Set([...owned, ...shop]);

  const fillMissing = (
    category: "top" | "bottom",
    ownedIds: string[],
    shopIds: string[],
  ) => {
    const exclude = usedIds();
    const wardrobePick = pickItemIdByCategory(
      category,
      wardrobeItems,
      exclude,
    );
    if (wardrobePick) {
      ownedIds.push(wardrobePick);
      exclude.add(wardrobePick);
      return;
    }

    if (!shopTheLook) return;

    const shopPick = pickItemIdByCategory(category, marketplaceItems, exclude);
    if (!shopPick) return;

    const shopItem = marketplaceById.get(shopPick);
    const price = Number(shopItem?.price ?? 0);
    const currentShopTotal = shopIds.reduce((sum, id) => {
      const item = marketplaceById.get(id);
      return sum + Number(item?.price ?? 0);
    }, 0);

    if (currentShopTotal + price <= budget) {
      shopIds.push(shopPick);
    }
  };

  let composition = outfitHasTopAndBottom(
    [...owned, ...shop],
    allItemsById,
  );
  if (!composition.hasTop) fillMissing("top", owned, shop);
  composition = outfitHasTopAndBottom([...owned, ...shop], allItemsById);
  if (!composition.hasBottom) fillMissing("bottom", owned, shop);

  owned = removeDuplicateCoreItems(owned, wardrobeItems);
  owned = sortItemIdsByGarmentType(owned, wardrobeById);

  return {
    ownedItemIds: owned,
    shopItemIds: shop,
    isComplete: outfitHasTopAndBottom(
      [...owned, ...shop],
      allItemsById,
    ),
  };
}

export async function outfitRoute(c: Context) {
  try {
    if (!HAS_AGNES_API_KEY) {
      return c.json(
        {
          error: "Agnes API key is not configured",
          details: "Set AGNES_API_KEY in .env and restart the API server.",
        },
        500,
      );
    }

    const auth = await requireAuthUserId(c);
    if (auth.error) return auth.error;

    const body: unknown = await c.req.json();

    if (!isRecord(body)) {
      return c.json({ error: "Request body must be a JSON object" }, 400);
    }

    const userId = auth.userId;
    const occasion =
      typeof body.occasion === "string" ? body.occasion : undefined;
    const weather =
      typeof body.weather === "string" ? body.weather : undefined;
    const stylePreference =
      typeof body.stylePreference === "string"
        ? body.stylePreference
        : undefined;
    const mustWearItem =
      typeof body.mustWearItem === "string" ? body.mustWearItem : undefined;
    const appearanceAnalysis = isRecord(body.appearanceAnalysis)
      ? body.appearanceAnalysis
      : null;
    const shopTheLook =
      typeof body.shopTheLook === "boolean" ? body.shopTheLook : false;
    const budget =
      typeof body.budget === "number" || typeof body.budget === "string"
        ? Number(body.budget)
        : 0;

    if (!occasion || !weather || !stylePreference) {
      return c.json(
        {
          error: "Missing required fields: occasion, weather, stylePreference",
        },
        400,
      );
    }

    if (!Number.isFinite(budget) || budget < 0) {
      return c.json({ error: "Budget must be a non-negative number" }, 400);
    }

    const { data: marketplaceItems, error: marketplaceError } = await supabase
      .from("marketplace_items")
      .select("*");

    if (marketplaceError) {
      return c.json(
        {
          error: "Failed to fetch marketplace items",
          details: marketplaceError,
        },
        500,
      );
    }

    const wardrobeItemsWithImages = (await getUserWardrobeItems(userId)).map(
      (item) => (item.image_url ? resolveItemImage(item) : item),
    );
    const marketplaceItemsWithImages = (marketplaceItems ?? []).map(
      resolveItemImage,
    );

    if (wardrobeItemsWithImages.length === 0) {
      return c.json(
        {
          error: "No wardrobe items are available",
          details:
            "Add clothing items in the Wardrobe tab before generating outfits.",
        },
        422,
      );
    }

    const allowedWardrobeIds = wardrobeItemsWithImages.map((item) => item.id);
    const allowedShopIds = marketplaceItemsWithImages.map((item) => item.id);
    const slimWardrobe = wardrobeItemsWithImages.map((item) =>
      slimWardrobeItem(item as Record<string, unknown>),
    );
    const slimMarketplace = marketplaceItemsWithImages.map((item) =>
      slimWardrobeItem(item as Record<string, unknown>),
    );

    const wardrobeRecords = wardrobeItemsWithImages as Record<string, unknown>[];
    const inventory = summarizeWardrobe(wardrobeRecords);

    const prompt = `
You are an AI fashion stylist for a wardrobe planning app.

Create 2 to 3 outfit suggestions.

Rules:
1. Use mostly the user's existing wardrobe items.
2. Only use wardrobe item IDs from the provided wardrobe list.
3. Only use marketplace item IDs from the provided marketplace list.
4. CRITICAL: Every outfit MUST include one item with garmentType "top" (or "dress") AND one item with garmentType "bottom" (or "dress"). Never return bottoms-only or tops-only outfits.
5. Each outfit needs a full look: top + bottom + shoes when possible. Do not return only pants, only jeans, or only one garment type.
6. Prefer exactly one primary top and exactly one bottom per outfit, plus shoes if available.
7. Never select two shirts, polos, T-shirts, or other primary tops for the same outfit.
8. An extra upper-body garment is allowed only when it is clearly outerwear such as a jacket, coat, blazer, cardigan, or overshirt.
9. If mustWearItem is provided, include the closest matching wardrobe item.
10. If shopTheLook is false, do not suggest marketplace items.
11. If shopTheLook is true, marketplace items are optional.
12. If suggesting marketplace items, total shop price for each outfit must be less than or equal to the budget.
13. If the budget is too low, set shopItemIds to [] and use only wardrobe items.
14. Do not invent item IDs.
15. Use the garmentType field on each wardrobe item — do not ignore it.
16. Use the weather assessment to choose practical fabrics, layers, and footwear.
17. Use the photo's visible skin-tone, undertone, contrast, and recommended colours when choosing colour combinations.
18. In each reason, explain both the weather suitability and why the colours complement the photo analysis.
19. Return valid JSON only. No markdown.

User request:
Occasion: ${occasion}
Weather: ${weather}
Style preference: ${stylePreference}
Must-wear item: ${mustWearItem || "None"}
Shop the Look: ${shopTheLook}
Budget: ${budget}

Wardrobe inventory:
- Tops: ${inventory.tops}
- Bottoms: ${inventory.bottoms}
- Dresses: ${inventory.dresses}
- Shoes: ${inventory.shoes}
- Outerwear: ${inventory.outerwear}
- Other: ${inventory.other}

Photo skin-tone and styling analysis:
${appearanceAnalysis ? JSON.stringify(appearanceAnalysis, null, 2) : "No photo analysis provided"}

User wardrobe items (each has garmentType — respect it):
${JSON.stringify(slimWardrobe, null, 2)}

Marketplace items:
${slimMarketplace.length > 0 ? JSON.stringify(slimMarketplace, null, 2) : "No marketplace items are available. Use wardrobe items only."}

Return this exact JSON structure:
{
  "outfits": [
    {
      "name": "string",
      "ownedItemIds": ["string"],
      "shopItemIds": ["string"],
      "totalShopPrice": 0,
      "reason": "string",
      "occasionFit": "Low | Medium | High",
      "weatherFit": "Low | Medium | High",
      "styleNotes": "string"
    }
  ],
  "shoppingSkippedReason": "string or null"
}
`;

    let parsed: unknown;
    try {
      parsed = await askAgnesForOutfits(prompt);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Outfit generation failed";
      const status = message.includes("aborted") ? 504 : 502;
      return c.json(
        {
          error: status === 504 ? "Outfit generation timed out" : "AI outfit generation failed",
          details: message,
        },
        status,
      );
    }

    if (!isRecord(parsed) || !Array.isArray(parsed.outfits)) {
      return c.json(
        { error: "AI response did not include an outfits array" },
        500,
      );
    }

    const wardrobeById = new Map(
      wardrobeRecords
        .filter((item) => typeof item.id === "string")
        .map((item) => [item.id as string, item]),
    );

    const processOutfit = (outfit: Record<string, unknown>) => {
      const rawOwnedIds = getStringArray(outfit.ownedItemIds).filter((id) =>
        allowedWardrobeIds.includes(id),
      );
      const rawShopIds = getStringArray(outfit.shopItemIds).filter((id) =>
        allowedShopIds.includes(id),
      );

      const ensured = ensureTopAndBottom(
        rawOwnedIds,
        rawShopIds,
        wardrobeRecords,
        marketplaceItemsWithImages as Record<string, unknown>[],
        shopTheLook,
        budget,
      );

      const ownedItemIds = ensured.ownedItemIds;
      const shopItemIds = ensured.shopItemIds;

      const shopItems = marketplaceItemsWithImages.filter((item) =>
        shopItemIds.includes(item.id),
      );

      const totalShopPrice = shopItems.reduce(
        (sum, item) => sum + Number(item.price),
        0,
      );

      const finalShopItemIds =
        shopTheLook && totalShopPrice <= budget ? shopItemIds : [];

      const finalShopItems = marketplaceItemsWithImages.filter((item) =>
        finalShopItemIds.includes(item.id),
      );

      const finalTotalShopPrice = finalShopItems.reduce(
        (sum, item) => sum + Number(item.price),
        0,
      );

      const reasonSuffix =
        !ensured.isComplete.hasTop || !ensured.isComplete.hasBottom
          ? " Note: this outfit could not be completed with both a top and bottom from your available items."
          : "";

      const sortedOwnedItemIds = sortItemIdsByGarmentType(
        ownedItemIds,
        wardrobeById,
      );
      const sortedOwnedItems = sortedOwnedItemIds
        .map((id) => wardrobeItemsWithImages.find((item) => item.id === id))
        .filter((item): item is (typeof wardrobeItemsWithImages)[number] =>
          Boolean(item),
        );

      return {
        ...outfit,
        ownedItemIds: sortedOwnedItemIds,
        shopItemIds: finalShopItemIds,
        totalShopPrice: finalTotalShopPrice,
        ownedItems: sortedOwnedItems,
        shopItems: finalShopItems,
        reason:
          typeof outfit.reason === "string"
            ? `${outfit.reason}${reasonSuffix}`
            : reasonSuffix.trim() || outfit.reason,
      };
    };

    const cleanedOutfits = parsed.outfits
      .filter(isRecord)
      .map(processOutfit)
      .filter((outfit) => {
        const allIds = [...outfit.ownedItemIds, ...outfit.shopItemIds];
        const itemsById = new Map([
          ...wardrobeById,
          ...marketplaceItemsWithImages
            .filter((item) => typeof item.id === "string")
            .map((item) => [item.id as string, item as Record<string, unknown>]),
        ]);
        const { hasTop, hasBottom } = outfitHasTopAndBottom(allIds, itemsById);
        return hasTop && hasBottom;
      });

    const finalOutfits =
      cleanedOutfits.length > 0
        ? cleanedOutfits
        : synthesizeOutfits(wardrobeRecords, 2)
            .filter(isRecord)
            .map(processOutfit)
            .filter((outfit) => {
              const allIds = [...outfit.ownedItemIds, ...outfit.shopItemIds];
              const { hasTop, hasBottom } = outfitHasTopAndBottom(
                allIds,
                wardrobeById,
              );
              return hasTop && hasBottom;
            });

    if (finalOutfits.length === 0) {
      return c.json(
        {
          error: "Could not build complete outfits",
          details:
            "Add at least one top and one bottom to your wardrobe so outfits can be generated.",
        },
        422,
      );
    }

    const providedSkippedReason =
      typeof parsed.shoppingSkippedReason === "string"
        ? parsed.shoppingSkippedReason
        : null;

    return c.json({
      outfits: finalOutfits,
      shoppingSkippedReason:
        providedSkippedReason ||
        (!shopTheLook
          ? "Shop the Look is turned off."
          : finalOutfits.every((outfit) => outfit.shopItemIds.length === 0)
            ? "No suitable marketplace items were found within the budget."
            : null),
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
