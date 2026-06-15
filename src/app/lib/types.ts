export type WeatherData = {
  location: string;
  description: string;
  temperature: string;
  humidity: string;
  rainChance: string;
  outfitAdvice?: string;
  sourceNote?: string;
  checkedAt?: string;
  error?: string;
  details?: string;
};

export type AppearanceAnalysis = {
  visiblePalette?: string[];
  dominantColour?: string;
  visibleSkinTone?: string;
  likelyUndertone?: string;
  contrastLevel?: string;
  recommendedColours?: string[];
  coloursToUseCarefully?: string[];
  stylingDirection?: string;
  reasoning?: string;
  lightingCaveat?: string;
};

export type OutfitItem = {
  id: string;
  name: string;
  image_url: string;
  category?: string;
  color?: string;
  style?: string[];
  storage_path?: string;
  price?: number | string;
  buy_url?: string;
};

export type Outfit = {
  name?: string;
  reason?: string;
  occasionFit?: string;
  weatherFit?: string;
  styleNotes?: string;
  ownedItems?: OutfitItem[];
  shopItems?: OutfitItem[];
  totalShopPrice?: number;
};

export type OutfitResult = {
  outfits?: Outfit[];
  shoppingSkippedReason?: string | null;
  error?: string;
  details?: unknown;
};

export type WardrobeResult = {
  items?: OutfitItem[];
  sourceNote?: string;
  error?: string;
  details?: unknown;
};

export type ShopResult = {
  items?: OutfitItem[];
  sourceNote?: string;
  error?: string;
  details?: unknown;
};

export type ApiError = {
  error?: string;
  details?: unknown;
};

export type TryOnResult = {
  imageUrl?: string;
  note?: string;
  error?: string;
  details?: unknown;
};

export type StyleAnalysis = {
  undertone: string;
  season: string;
  skinTone: string;
  palette: { name: string; hex: string }[];
  avoidColours: { name: string; hex: string }[];
  measurements: Record<string, string>;
  sizes: Record<string, string>;
  bodyShape: string;
  styleAdvice: string;
};

export function fitScoreFromLabels(occasionFit?: string, weatherFit?: string) {
  const map: Record<string, number> = { low: 70, medium: 85, high: 97 };
  const o = map[(occasionFit ?? "").toLowerCase()] ?? 80;
  const w = map[(weatherFit ?? "").toLowerCase()] ?? 80;
  return Math.round((o + w) / 2);
}
