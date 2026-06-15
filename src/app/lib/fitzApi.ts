import type {
  AppearanceAnalysis,
  OutfitResult,
  ShopResult,
  TryOnResult,
  WardrobeResult,
  WeatherData,
} from "./types";
import { httpErrorMessage, readResponsePayload } from "./http";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function errorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as { error?: string }).error === "string"
  ) {
    const error = (value as { error: string }).error;
    const details = (value as { details?: unknown }).details;
    return typeof details === "string" && details.trim()
      ? `${error}: ${details}`
      : error;
  }
  return fallback;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  const { data, rawText } = await readResponsePayload(response);
  if (data === null && rawText.trim()) {
    throw new Error(httpErrorMessage(response, rawText, "Request failed"));
  }
  const payload = (data ?? {}) as T & { error?: string };
  if (!response.ok) {
    throw new Error(errorMessage(payload, httpErrorMessage(response, rawText, "Request failed")));
  }
  return payload;
}

export function fetchWeather() {
  return request<WeatherData>("/api/weather", { cache: "no-store" });
}

export function analyzeImage(imageDataUrl: string) {
  return request<{ analysis: AppearanceAnalysis }>("/api/analyze-image", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl }),
  });
}

export function generateOutfit(
  token: string,
  body: {
    occasion: string;
    weather: string;
    stylePreference: string;
    mustWearItem?: string;
    appearanceAnalysis?: AppearanceAnalysis | null;
    shopTheLook?: boolean;
    budget?: number;
  },
) {
  return request<OutfitResult>(
    "/api/outfit",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    token,
  );
}

export function classifyGarment(imageUrl: string, name?: string) {
  return request<{ category: string; label?: string }>("/api/classify-garment", {
    method: "POST",
    body: JSON.stringify({ imageUrl, name }),
  });
}

export function generateTryOn(body: {
  personImage: string;
  garments?: { name: string; imageUrl: string }[];
  outfitName?: string;
}) {
  return request<TryOnResult>("/api/try-on", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchWardrobe(token: string) {
  return request<WardrobeResult>(
    "/api/wardrobe",
    { cache: "no-store" },
    token,
  );
}

export function fetchShop() {
  return request<ShopResult>("/api/shop", { cache: "no-store" });
}

export function buildWeatherContext(weather: WeatherData) {
  return [
    weather.description,
    `Temperature: ${weather.temperature}`,
    `Humidity: ${weather.humidity}`,
    `Rain: ${weather.rainChance}`,
    weather.outfitAdvice
      ? `Weather clothing advice: ${weather.outfitAdvice}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");
}
