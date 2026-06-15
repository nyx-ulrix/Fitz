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

function hasCompleteWeather(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    ["description", "temperature", "humidity", "rainChance", "outfitAdvice"].every(
      (key) => typeof value[key] === "string" && (value[key] as string).trim().length > 0,
    )
  );
}

async function askAgnes(messages: Message[]) {
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

  return {
    parsed: parseJsonResponse(rawText),
    rawText,
  };
}

export async function weatherRoute(c: Context) {
  try {
    if (!HAS_AGNES_API_KEY) {
      return c.json(
        {
          error: "Agnes API key is not configured",
          details:
            "Set AGNES_API_KEY in server/.env or root .env, then restart the API server.",
        },
        500,
      );
    }

    const singaporeTime = new Intl.DateTimeFormat("en-SG", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Singapore",
    }).format(new Date());

    const systemPrompt = `You provide concise weather-aware clothing guidance.
Use current information or tools when available. If live weather data is unavailable,
provide a sensible Singapore seasonal estimate or range for the stated date and time.
Clearly prefix estimated values with "Estimated:".
Every requested field must contain a useful string. Never return null, an empty string,
"not verified", "unavailable", or omit a field. Return valid JSON only.`;

    const userPrompt = `Assess Singapore weather for outfit planning.

Current Singapore date and time: ${singaporeTime}

Return exactly:
{
  "location": "Singapore",
  "description": "short weather description; label it estimated if not live",
  "temperature": "value such as 30°C, or Estimated: 29-32°C",
  "humidity": "value such as 78%, or Estimated: 70-85%",
  "rainChance": "current rain status/chance, or an explicitly labeled estimate",
  "outfitAdvice": "one practical clothing recommendation based on all values",
  "sourceNote": "state whether values are live or estimated and why"
}`;

    let weatherResponse = await askAgnes([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    if (!hasCompleteWeather(weatherResponse.parsed)) {
      weatherResponse = await askAgnes([
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${userPrompt}

Your previous response left required cards blank:
${weatherResponse.rawText}

Repair it now. Fill description, temperature, humidity, rainChance, and outfitAdvice.
Use clearly labeled estimates or ranges where live values are unavailable.`,
        },
      ]);
    }

    if (!hasCompleteWeather(weatherResponse.parsed)) {
      return c.json(
        {
          error: "Agnes returned an incomplete weather assessment",
          details: weatherResponse.rawText,
        },
        502,
      );
    }

    return c.json({
      ...weatherResponse.parsed,
      checkedAt: singaporeTime,
      provider: "Agnes AI",
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Weather server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
