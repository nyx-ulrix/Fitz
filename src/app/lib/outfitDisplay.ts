import type { Outfit } from "./types";
import { fitScoreFromLabels } from "./types";

export type DisplayGarment = {
  name: string;
  img: string;
  owned: boolean;
};

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
  const owned = outfit.ownedItems ?? [];
  const shop = outfit.shopItems ?? [];
  const garmentItems: DisplayGarment[] = [
    ...owned.map((item) => ({
      name: item.name,
      img: item.image_url,
      owned: true,
    })),
    ...shop.map((item) => ({
      name: item.name,
      img: item.image_url,
      owned: false,
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
