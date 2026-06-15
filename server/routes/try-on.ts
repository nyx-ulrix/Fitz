import type { Context } from "hono";
import {
  AGNES_API_KEY,
  AGNES_ENDPOINT,
  AGNES_IMAGE_ENDPOINT,
  HAS_AGNES_API_KEY,
} from "../lib/env.js";
import {
  estimateDataUrlBytes,
  findImageInValue,
  getAssistantText,
  getStringArray,
  isRecord,
} from "../lib/utils.js";

const MAX_PERSON_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_GARMENT_IMAGES = 4;

type GarmentReference = {
  name: string;
  imageUrl: string;
};

function getGarmentReferences(value: unknown): GarmentReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.imageUrl !== "string" ||
      !entry.imageUrl.trim()
    ) {
      return [];
    }

    return [
      {
        name:
          typeof entry.name === "string" && entry.name.trim()
            ? entry.name.trim()
            : `Garment ${index + 1}`,
        imageUrl: entry.imageUrl,
      },
    ];
  });
}

export async function tryOnRoute(c: Context) {
  try {
    if (!HAS_AGNES_API_KEY) {
      return c.json({ error: "Agnes API key is not configured" }, 500);
    }

    const body: unknown = await c.req.json();

    if (!isRecord(body)) {
      return c.json({ error: "Request body must be a JSON object" }, 400);
    }

    const personImage =
      typeof body.personImage === "string" ? body.personImage : "";
    const suppliedGarments = getGarmentReferences(body.garments);
    const legacyGarments = getStringArray(body.garmentImages).map(
      (imageUrl, index) => ({
        name: `Garment ${index + 1}`,
        imageUrl,
      }),
    );
    const garments = (suppliedGarments.length
      ? suppliedGarments
      : legacyGarments
    ).slice(0, MAX_GARMENT_IMAGES);
    const outfitName =
      typeof body.outfitName === "string" ? body.outfitName : "Selected outfit";

    if (!/^data:image\/(jpeg|png|webp);base64,/i.test(personImage)) {
      return c.json(
        { error: "A valid uploaded person image is required" },
        400,
      );
    }

    if (estimateDataUrlBytes(personImage) > MAX_PERSON_IMAGE_BYTES) {
      return c.json({ error: "Person image must be 5 MB or smaller" }, 413);
    }

    if (garments.length === 0) {
      return c.json(
        { error: "At least one selected garment image is required" },
        400,
      );
    }

    const garmentLabels = garments
      .map((garment, index) => `Image ${index + 2}: ${garment.name}`)
      .join("\n");
    const content: Record<string, unknown>[] = [
      {
        type: "text",
        text: `Write a detailed image-generation prompt for an outfit visualization named "${outfitName}".

Image 1 is the person photo and must remain the identity and composition reference.
The remaining images are the exact selected garment references.
${garmentLabels}

Describe the visible person in unusually precise, non-identifying visual detail:
face shape and proportions, jawline, cheek shape, eyebrow shape, eye shape, eyewear frame
shape and colour, nose and mouth proportions, hairstyle, hairline, facial hair if present,
skin tone, expression, visible build, shoulder width, pose, hand position, framing, camera
angle, lighting, and background. Do not infer ethnicity, identity, health, or other sensitive
traits. Analyze every garment image separately. For each garment, precisely preserve its
garment type, dominant and secondary colours, sleeve length, collar or neckline, fit,
silhouette, hem length, fabric appearance, pattern, trim, buttons, pockets, logos, and
other visible construction details.

Then specify a photorealistic image of a person matching those visible traits as closely as
possible while naturally wearing the selected garments. Keep the same glasses, hairstyle,
face proportions, expression, build, pose, hand position, framing, camera angle, lighting,
and background. Do not beautify, age-shift, change facial structure, remove eyewear, or
invent accessories. Only replace the clothing. Use realistic fabric folds, overlaps, hands,
and body proportions.

GARMENT FIDELITY IS NON-NEGOTIABLE. The generated person must wear the exact listed
garment combination. Never replace a short-sleeve shirt with long sleeves, add a cardigan
or jacket, change a crew neck into a V-neck or collar, change the garment colour, or swap
the selected top or bottom for a visually similar item. Do not add any unlisted garment.
If a detail is uncertain, copy the most clearly visible interpretation from its reference
instead of inventing a replacement.

Return only the final image-generation prompt. Do not include headings or styling advice.`,
      },
      { type: "image_url", image_url: { url: personImage } },
      ...garments.map((garment) => ({
        type: "image_url",
        image_url: { url: garment.imageUrl },
      })),
    ];

    const visionResponse = await fetch(AGNES_ENDPOINT, {
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
              "You create highly precise photorealistic reconstruction prompts from person and garment references. Prioritize consistent visible facial geometry, eyewear, hair, build, pose, framing, and background. Do not identify people or infer sensitive traits.",
          },
          { role: "user", content },
        ],
        temperature: 0.2,
      }),
    });

    const visionData: unknown = await visionResponse.json();

    if (!visionResponse.ok) {
      return c.json(
        {
          error: "Agnes could not analyze the try-on references",
          details: visionData,
        },
        visionResponse.status as 400,
      );
    }

    const generationPrompt = getAssistantText(visionData);

    if (!generationPrompt) {
      return c.json(
        { error: "Agnes returned no try-on generation prompt" },
        502,
      );
    }

    const garmentConstraint = garments.map((g) => g.name).join(", ");
    const finalGenerationPrompt = `STRICT WARDROBE RECONSTRUCTION.
Required garments: ${garmentConstraint}.
Preserve every referenced garment's exact category, colour, sleeve length, neckline,
silhouette, pattern, and visible details. Do not add layers or substitute any garment.

${generationPrompt}`;

    const imageResponse = await fetch(AGNES_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGNES_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "agnes-image-2.1-flash",
        prompt: finalGenerationPrompt,
        n: 1,
      }),
    });

    const imageData: unknown = await imageResponse.json();

    if (!imageResponse.ok) {
      return c.json(
        { error: "Agnes image generation failed", details: imageData },
        imageResponse.status as 400,
      );
    }

    const generatedImage = findImageInValue(imageData);

    if (!generatedImage) {
      return c.json(
        {
          error: "Agnes did not return a generated image",
          details: imageData,
        },
        502,
      );
    }

    return c.json({
      imageUrl: generatedImage,
      note: "This is a best-effort AI reconstruction using the photo's visible traits. Agnes image generation may still vary from the exact uploaded identity.",
    });
  } catch (error: unknown) {
    return c.json(
      {
        error: "Could not generate the virtual try-on",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}
