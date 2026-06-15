import type { AppearanceAnalysis, StyleAnalysis } from "./types";

const NAMED_COLOURS: Record<string, string> = {
  camel: "#c19a6b",
  terracotta: "#c0694a",
  sage: "#8aab8a",
  ivory: "#f5f0e8",
  olive: "#8a8a4a",
  blush: "#e8a898",
  chocolate: "#5c3d2e",
  navy: "#1e3a5f",
  cream: "#f5f0e8",
  white: "#f8f8f8",
  black: "#1a1a1a",
  grey: "#9a9aaa",
  gray: "#9a9aaa",
  rust: "#b5451b",
  coral: "#e07a5f",
  teal: "#2a9d8f",
  burgundy: "#6b2737",
  beige: "#d4b896",
  tan: "#d2b48c",
  gold: "#c9a227",
  mustard: "#c9a227",
  lavender: "#b8a9c9",
  mint: "#98d4bb",
  charcoal: "#36454f",
  denim: "#4a6fa5",
  blue: "#4a6fa5",
  green: "#6b8e6b",
  pink: "#e8a898",
  red: "#c0392b",
  yellow: "#f4d03f",
  orange: "#e67e22",
  purple: "#8e6bb0",
  brown: "#5c3d2e",
};

function colourToHex(name: string) {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  for (const [token, hex] of Object.entries(NAMED_COLOURS)) {
    if (key.includes(token)) return hex;
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

function undertoneToSeason(undertone?: string) {
  switch ((undertone ?? "").toLowerCase()) {
    case "warm":
      return "Spring / Autumn";
    case "cool":
      return "Summer / Winter";
    case "neutral":
      return "Universal";
    default:
      return "Pending analysis";
  }
}

export function toStyleAnalysis(analysis: AppearanceAnalysis): StyleAnalysis {
  const undertone = analysis.likelyUndertone ?? "unclear";
  return {
    undertone: undertone.charAt(0).toUpperCase() + undertone.slice(1),
    season: undertoneToSeason(analysis.likelyUndertone),
    skinTone: analysis.visibleSkinTone ?? "Pending analysis",
    palette: (analysis.recommendedColours ?? []).map((name) => ({
      name,
      hex: colourToHex(name),
    })),
    avoidColours: (analysis.coloursToUseCarefully ?? []).map((name) => ({
      name,
      hex: colourToHex(name),
    })),
    measurements: {},
    sizes: {},
    bodyShape: "",
    styleAdvice: [analysis.stylingDirection, analysis.reasoning]
      .filter(Boolean)
      .join(" "),
  };
}

export function appearanceFromProfile(profile: {
  undertone?: string;
  season?: string;
  skinTone?: string;
  palette?: { name: string; hex: string }[];
  avoidColours?: { name: string; hex: string }[];
  styleAdvice?: string;
}): AppearanceAnalysis | null {
  if (!profile.undertone && !profile.skinTone && !profile.styleAdvice) {
    return null;
  }
  return {
    likelyUndertone: profile.undertone?.toLowerCase(),
    visibleSkinTone: profile.skinTone,
    recommendedColours: profile.palette?.map((c) => c.name),
    coloursToUseCarefully: profile.avoidColours?.map((c) => c.name),
    stylingDirection: profile.styleAdvice,
  };
}
