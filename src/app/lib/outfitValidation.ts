import type { Outfit, OutfitItem } from "./types";

type GarmentKind = "top" | "outerwear" | "bottom" | "dress" | "shoes" | "other";

function garmentKind(item: OutfitItem): GarmentKind {
  const category = (item.category ?? "").toLowerCase().trim();
  if (category === "top" || category === "tops") return "top";
  if (category === "bottom" || category === "bottoms") return "bottom";
  if (category === "dress" || category === "dresses") return "dress";
  if (category === "outerwear") return "outerwear";
  if (category === "shoes" || category === "shoe") return "shoes";

  const description = `${item.category ?? ""} ${item.name}`.toLowerCase();

  if (/(dress)/.test(description)) {
    return "dress";
  }
  if (/(jacket|coat|blazer|cardigan|overshirt|outerwear)/.test(description)) {
    return "outerwear";
  }
  if (/(top|shirt|t-shirt|tee|polo|henley|sweater|blouse|hoodie)/.test(description)) {
    return "top";
  }
  if (/(bottom|jean|trouser|pant|short|chino|skirt)/.test(description)) {
    return "bottom";
  }
  if (/(shoe|sneaker|loafer|boot|sandal|heel)/.test(description)) {
    return "shoes";
  }
  return "other";
}

export function validateOutfitForVisualization(outfit: Outfit) {
  const items = [...(outfit.ownedItems ?? []), ...(outfit.shopItems ?? [])];
  if (items.length === 0) {
    return "This outfit has no clothing items to visualize.";
  }

  const counts = { top: 0, outerwear: 0, bottom: 0, dress: 0, shoes: 0 };
  for (const item of items) {
    const kind = garmentKind(item);
    if (kind in counts) counts[kind as keyof typeof counts] += 1;
  }

  const hasDress = counts.dress > 0;

  if (counts.top === 0 && !hasDress) {
    return "This outfit is missing a top. Regenerate or pick another outfit.";
  }

  if (counts.bottom === 0 && !hasDress) {
    return "This outfit is missing a bottom. Regenerate or pick another outfit.";
  }

  if (counts.top > 1) {
    return "This outfit has more than one top. Pick a set with a single shirt or tee (outerwear like a jacket is fine on top).";
  }

  if (counts.top + counts.outerwear > 2) {
    return "This outfit has too many upper-body layers. Use at most one top and one outerwear piece.";
  }

  return null;
}

export function outfitItemsForTryOn(outfit: Outfit) {
  const items = [...(outfit.ownedItems ?? []), ...(outfit.shopItems ?? [])];
  const picked: OutfitItem[] = [];
  const used = { top: 0, outerwear: 0, bottom: 0, dress: 0, shoes: 0 };

  for (const item of items) {
    const kind = garmentKind(item);
    if (kind === "other") {
      picked.push(item);
      continue;
    }
    if (kind === "top" && used.top >= 1) continue;
    if (kind === "outerwear" && used.outerwear >= 1) continue;
    if (kind === "bottom" && used.bottom >= 1) continue;
    if (kind === "dress" && used.dress >= 1) continue;
    if (kind === "shoes" && used.shoes >= 1) continue;

    picked.push(item);
    used[kind] += 1;
  }

  return picked
    .filter((item) => item.image_url)
    .map((item) => ({
      name: item.name,
      imageUrl: item.image_url,
    }));
}
