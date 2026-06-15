import type { Outfit } from "./types";
import { fitScoreFromLabels } from "./types";

function garmentSortOrder(item: { category?: string; name: string }) {
  const category = (item.category ?? "").toLowerCase();
  if (category === "top" || category === "tops") return 0;
  if (category === "dress" || category === "dresses") return 1;
  if (category === "outerwear") return 2;
  if (category === "bottom" || category === "bottoms") return 3;
  if (category === "shoes" || category === "shoe") return 4;
  return 5;
}

export type DisplayGarment = {
  name: string;
  img: string;
  owned: boolean;
  category?: string;
};

function garmentKindFromCategory(category?: string, name = "") {
  const value = `${category ?? ""} ${name}`.toLowerCase();
  if (category === "top" || category === "tops") return "top";
  if (category === "bottom" || category === "bottoms") return "bottom";
  if (category === "dress" || category === "dresses") return "dress";
  if (/(t-shirt|tee|shirt|blouse|polo|sweater|hoodie|tank)/.test(value)) return "top";
  if (/(jean|trouser|pant|chino|skirt|shorts)/.test(value)) return "bottom";
  if (/(dress)/.test(value)) return "dress";
  return "other";
}

export function getOutfitPreviewGarments(garmentItems: DisplayGarment[]) {
  const top =
    garmentItems.find((item) => garmentKindFromCategory(item.category, item.name) === "top") ??
    garmentItems.find((item) => garmentKindFromCategory(item.category, item.name) === "dress");
  const bottom =
    garmentItems.find((item) => garmentKindFromCategory(item.category, item.name) === "bottom") ??
    (top && garmentKindFromCategory(top.category, top.name) === "dress" ? top : undefined);

  return { top, bottom };
}

export type DisplayOutfit = {
  id: number;
  name: string;
  vibe: string;
  img: string;
  items: string[];
  garmentItems: DisplayGarment[];
  shopCount: number;
  score: number;
  reason?: string;
  raw: Outfit;
};

export function outfitToDisplay(
  outfit: Outfit,
  index: number,
  tryOnImage?: string,
): DisplayOutfit {
  const owned = [...(outfit.ownedItems ?? [])].sort(
    (a, b) => garmentSortOrder(a) - garmentSortOrder(b),
  );
  const shop = [...(outfit.shopItems ?? [])].sort(
    (a, b) => garmentSortOrder(a) - garmentSortOrder(b),
  );
  const garmentItems: DisplayGarment[] = [
    ...owned.map((item) => ({
      name: item.name,
      img: item.image_url,
      owned: true,
      category: item.category,
    })),
    ...shop.map((item) => ({
      name: item.name,
      img: item.image_url,
      owned: false,
      category: item.category,
    })),
  ];
  return {
    id: index,
    name: outfit.name ?? `Outfit ${index + 1}`,
    vibe: outfit.styleNotes ?? outfit.occasionFit ?? "Styled",
    img: tryOnImage ?? garmentItems[0]?.img ?? "",
    items: garmentItems.map((item) => item.name),
    garmentItems,
    shopCount: shop.length,
    score: fitScoreFromLabels(outfit.occasionFit, outfit.weatherFit),
    reason: outfit.reason,
    raw: outfit,
  };
}
