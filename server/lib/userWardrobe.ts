import { getKvByPrefix } from "./kvStore.js";
import { isRecord } from "./utils.js";

export type WardrobeCatalogItem = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  color: string | null;
  style: string[];
  weather: string[];
  formality: null;
  image_url: string;
  created_at: string | null;
  brand?: string;
  season?: string;
  price?: number;
  notes?: string;
};

const CATEGORY_ALIASES: Record<string, string> = {
  tops: "top",
  top: "top",
  bottoms: "bottom",
  bottom: "bottom",
  dresses: "dress",
  dress: "dress",
  shoes: "shoes",
  shoe: "shoes",
  outerwear: "outerwear",
  accessories: "accessories",
  accessory: "accessories",
  bags: "bags",
  bag: "bags",
};

function normalizeCategory(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "other";
  const key = value.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? key;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function mapKvItemToCatalogItem(
  raw: unknown,
  userId: string,
): WardrobeCatalogItem | null {
  if (!isRecord(raw) || typeof raw.id !== "string") return null;

  const category = normalizeCategory(raw.category);
  const color =
    asString(raw.colour) ||
    asString(raw.color) ||
    null;
  const imageUrl =
    asString(raw.image_url) ||
    asString(raw.imageUrl) ||
    asString(raw.img) ||
    "";

  return {
    id: raw.id,
    user_id: asString(raw.userId) || userId,
    name: asString(raw.name) || "Wardrobe item",
    category,
    color,
    style: category ? [category] : [],
    weather: asString(raw.season) ? [asString(raw.season)] : [],
    formality: null,
    image_url: imageUrl,
    created_at: asString(raw.createdAt) || null,
    brand: asString(raw.brand) || undefined,
    season: asString(raw.season) || undefined,
    price: asNumber(raw.price),
    notes: asString(raw.notes) || undefined,
  };
}

export async function getUserWardrobeItems(userId: string) {
  const rows = await getKvByPrefix(`wardrobe:${userId}:`);
  return rows
    .map((row) => mapKvItemToCatalogItem(row, userId))
    .filter((item): item is WardrobeCatalogItem => item !== null);
}
