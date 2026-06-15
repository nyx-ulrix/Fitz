import type { Context } from "hono";
import {
  AGNES_API_KEY,
  AGNES_ENDPOINT,
  HAS_AGNES_API_KEY,
} from "../lib/env.js";
import {
  getAssistantText,
  isRecord,
  parseJsonResponse,
} from "../lib/utils.js";

type Message = { role: string; content: string };

const AGNES_TIMEOUT_MS = 25_000;
const WEATHER_CACHE_MS = 10 * 60 * 1000;

let weatherCache: { expiresAt: number; payload: Record<string, unknown> } | null =
  null;

function singaporeTimestamp() {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date());
}

function fallbackWeather(checkedAt: string) {
  return {
    location: "Singapore",
    description: "Estimated: Warm, humid tropical conditions",
    temperature: "Estimated: 28-32°C",
    humidity: "Estimated: 75-90%",
    rainChance: "Estimated: Chance of afternoon showers",
    outfitAdvice:
      "Wear lightweight breathable fabrics and keep a compact umbrella handy.",
    sourceNote:
      "Fallback estimate used because live weather lookup was slow or unavailable.",
    checkedAt,
    provider: "Fitz estimate",
  };
}

function normalizeWeather(parsed: unknown, checkedAt: string) {
  const base = fallbackWeather(checkedAt);
  if (!isRecord(parsed)) return base;

  const fields = [
    "location",
    "description",
    "temperature",
    "humidity",
    "rainChance",
    "outfitAdvice",
    "sourceNote",
  ] as const;

  const result = { ...base };
  for (const key of fields) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }

  result.provider = "Agnes AI";
  return result;
}

async function askAgnes(messages: Message[]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGNES_TIMEOUT_MS);

  try {
    const response = await fetch(AGNES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGNES_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Agnes request failed (${response.status}): ${await response.text()}`,
      );
    }

    const data: unknown = await response.json();
    const rawText = getAssistantText(data);

    if (!rawText) {
      throw new Error("Agnes returned no weather assessment");
    }

    let parsed: unknown;
    try {
      parsed = parseJsonResponse(rawText);
    } catch {
      throw new Error(`Agnes returned invalid JSON: ${rawText.slice(0, 200)}`);
    }

    return { parsed, rawText };
  } finally {
    clearTimeout(timer);
  }
}

export async function weatherRoute(c: Context) {
  const checkedAt = singaporeTimestamp();

  try {
    if (weatherCache && weatherCache.expiresAt > Date.now()) {
      return c.json(weatherCache.payload);
    }

    if (!HAS_AGNES_API_KEY) {
      const payload = fallbackWeather(checkedAt);
      return c.json(payload);
    }

    const userPrompt = `Singapore outfit weather for ${checkedAt}.
Return JSON only with keys location, description, temperature, humidity, rainChance, outfitAdvice, sourceNote.
Use live data if available; otherwise prefix estimates with "Estimated:".`;

    let payload: Record<string, unknown>;
    try {
      const weatherResponse = await askAgnes([
        {
          role: "system",
          content:
            "You provide concise Singapore weather for clothing choices. Return valid JSON only.",
        },
        { role: "user", content: userPrompt },
      ]);
      payload = normalizeWeather(weatherResponse.parsed, checkedAt);
    } catch (error: unknown) {
      console.log("Weather Agnes fallback:", error);
      payload = fallbackWeather(checkedAt);
    }

    weatherCache = {
      expiresAt: Date.now() + WEATHER_CACHE_MS,
      payload,
    };

    return c.json(payload);
  } catch (error: unknown) {
    return c.json(
      {
        ...fallbackWeather(checkedAt),
        error:
          error instanceof Error ? error.message : "Unknown weather error",
      },
      200,
    );
  }
}
