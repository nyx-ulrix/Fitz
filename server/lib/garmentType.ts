export type GarmentType =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "other";

const CATEGORY_TYPES: Record<string, GarmentType> = {
  top: "top",
  tops: "top",
  bottom: "bottom",
  bottoms: "bottom",
  dress: "dress",
  dresses: "dress",
  outerwear: "outerwear",
  shoes: "shoes",
  shoe: "shoes",
  accessories: "other",
  accessory: "other",
  bags: "other",
  bag: "other",
};

export function getGarmentType(item: Record<string, unknown>): GarmentType {
  const category =
    typeof item.category === "string" ? item.category.toLowerCase().trim() : "";
  if (category && CATEGORY_TYPES[category]) {
    return CATEGORY_TYPES[category];
  }

  const name = typeof item.name === "string" ? item.name.toLowerCase() : "";

  if (/(dress)/.test(name)) return "dress";
  if (/(jacket|coat|blazer|cardigan|overshirt|outerwear)/.test(name)) {
    return "outerwear";
  }
  if (/(t-shirt|tee|shirt|blouse|polo|henley|sweater|hoodie|tank)/.test(name)) {
    return "top";
  }
  if (/(jean|trouser|pant|chino|skirt)/.test(name)) return "bottom";
  if (/(shorts)\b/.test(name)) return "bottom";
  if (/(sneaker|loafer|boot|sandal|heel)/.test(name)) return "shoes";

  return "other";
}

export function outfitHasTopAndBottom(
  itemIds: string[],
  itemsById: Map<string, Record<string, unknown>>,
) {
  let hasTop = false;
  let hasBottom = false;

  for (const id of itemIds) {
    const item = itemsById.get(id);
    if (!item) continue;

    const type = getGarmentType(item);
    if (type === "dress") {
      hasTop = true;
      hasBottom = true;
    } else if (type === "top") {
      hasTop = true;
    } else if (type === "bottom") {
      hasBottom = true;
    }
  }

  return { hasTop, hasBottom };
}

export function sortItemIdsByGarmentType(
  itemIds: string[],
  itemsById: Map<string, Record<string, unknown>>,
) {
  const order: Record<GarmentType, number> = {
    top: 0,
    dress: 1,
    outerwear: 2,
    bottom: 3,
    shoes: 4,
    other: 5,
  };

  return [...itemIds].sort((a, b) => {
    const typeA = itemsById.get(a) ? getGarmentType(itemsById.get(a)!) : "other";
    const typeB = itemsById.get(b) ? getGarmentType(itemsById.get(b)!) : "other";
    return order[typeA] - order[typeB];
  });
}

export function summarizeWardrobe(items: Record<string, unknown>[]) {
  const counts = {
    tops: 0,
    bottoms: 0,
    dresses: 0,
    shoes: 0,
    outerwear: 0,
    other: 0,
  };

  for (const item of items) {
    const type = getGarmentType(item);
    if (type === "top") counts.tops += 1;
    else if (type === "bottom") counts.bottoms += 1;
    else if (type === "dress") counts.dresses += 1;
    else if (type === "shoes") counts.shoes += 1;
    else if (type === "outerwear") counts.outerwear += 1;
    else counts.other += 1;
  }

  return counts;
}
