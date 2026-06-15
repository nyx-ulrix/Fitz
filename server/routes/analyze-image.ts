import type { Context } from "hono";
import {
  AGNES_API_KEY,
  AGNES_ENDPOINT,
  HAS_AGNES_API_KEY,
} from "../lib/env.js";
import {
  estimateDataUrlBytes,
  getAssistantText,
  isRecord,
  parseJsonResponse,
} from "../lib/utils.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function analyzeImageRoute(c: Context) {
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

    const body: unknown = await c.req.json();
    const imageDataUrl =
      isRecord(body) && typeof body.imageDataUrl === "string"
        ? body.imageDataUrl
        : null;

    if (
      !imageDataUrl ||
      !/^data:image\/(jpeg|png|webp);base64,/i.test(imageDataUrl)
    ) {
      return c.json(
        { error: "Please upload a JPEG, PNG, or WebP image" },
        400,
      );
    }

    if (estimateDataUrlBytes(imageDataUrl) > MAX_IMAGE_BYTES) {
      return c.json({ error: "Image must be 5 MB or smaller" }, 413);
    }

    const aiResponse = await fetch(AGNES_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGNES_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "agnes-2.0-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a careful personal stylist. You may describe visible skin tone and undertone for clothing colour matching. Do not identify the person or infer ethnicity, health, age, gender identity, or other sensitive traits. Treat all colour readings as approximate and affected by lighting. Return valid JSON only.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this photo before outfit generation.

Return exactly:
{
  "visiblePalette": ["3 to 5 visible colour names"],
  "dominantColour": "string",
  "visibleSkinTone": "brief neutral description of the visible skin-tone depth and surface colour, or unclear",
  "likelyUndertone": "warm | cool | neutral | unclear",
  "contrastLevel": "low | medium | high",
  "recommendedColours": ["4 to 6 clothing colour names"],
  "coloursToUseCarefully": ["0 to 4 colour names"],
  "stylingDirection": "short styling direction",
  "reasoning": "2 to 4 sentences explaining the visible colour observations and why the direction may work",
  "lightingCaveat": "short caveat about lighting and camera colour"
}`,
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      return c.json(
        {
          error: "Image analysis request failed",
          details: await aiResponse.text(),
        },
        aiResponse.status as 400,
      );
    }

    const aiData: unknown = await aiResponse.json();
    const rawText = getAssistantText(aiData);

    if (!rawText) {
      return c.json({ error: "The AI returned no image analysis" }, 502);
    }

    let analysis: unknown;
    try {
      analysis = parseJsonResponse(rawText);
    } catch {
      return c.json(
        {
          error: "The AI image analysis was not valid JSON",
          details: rawText,
        },
        502,
      );
    }

    if (!isRecord(analysis)) {
      return c.json({ error: "The AI returned an invalid image analysis" }, 502);
    }

    return c.json({ analysis });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Could not analyze the image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
