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
const MAX_COMPARISON_OUTFITS = 3;
const MAX_GARMENTS_PER_COMPARISON_OUTFIT = 3;

type GarmentReference = {
  name: string;
  imageUrl: string;
};

type OutfitReference = {
  outfitName: string;
  garments: GarmentReference[];
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

function getOutfitReferences(value: unknown): OutfitReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const garments = getGarmentReferences(entry.garments).slice(
      0,
      MAX_GARMENTS_PER_COMPARISON_OUTFIT,
    );
    if (!garments.length) return [];

    return [
      {
        outfitName:
          typeof entry.outfitName === "string" && entry.outfitName.trim()
            ? entry.outfitName.trim()
            : `Outfit ${index + 1}`,
        garments,
      },
    ];
  });
}

async function requestGenerationPrompt(
  content: Record<string, unknown>[],
) {
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
    throw new Error(
      `Agnes could not analyze the try-on references (${visionResponse.status})`,
    );
  }

  const generationPrompt = getAssistantText(visionData);
  if (!generationPrompt) {
    throw new Error("Agnes returned no try-on generation prompt");
  }

  return generationPrompt;
}

async function requestGeneratedImage(
  generationPrompt: string,
  garmentConstraint: string,
) {
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
    throw new Error(`Agnes image generation failed (${imageResponse.status})`);
  }

  const generatedImage = findImageInValue(imageData);
  if (!generatedImage) {
    throw new Error("Agnes did not return a generated image");
  }

  return generatedImage;
}

function validatePersonImage(personImage: string) {
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(personImage)) {
    return "A valid uploaded person image is required";
  }
  if (estimateDataUrlBytes(personImage) > MAX_PERSON_IMAGE_BYTES) {
    return "Person image must be 5 MB or smaller";
  }
  return null;
}

async function runSingleOutfitTryOn(
  personImage: string,
  garments: GarmentReference[],
  outfitName: string,
) {
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

  const generationPrompt = await requestGenerationPrompt(content);
  const garmentConstraint = garments.map((g) => g.name).join(", ");
  const imageUrl = await requestGeneratedImage(generationPrompt, garmentConstraint);

  return {
    imageUrl,
    note: "This is a best-effort AI reconstruction using the photo's visible traits. Agnes image generation may still vary from the exact uploaded identity.",
  };
}

async function runComparisonTryOn(
  personImage: string,
  outfits: OutfitReference[],
) {
  let imageIndex = 2;
  const panelDescriptions: string[] = [];
  const garmentImages: GarmentReference[] = [];

  for (const [panelIndex, outfit] of outfits.entries()) {
    const garmentRefs = outfit.garments.map((garment) => {
      const ref = `Image ${imageIndex}: ${garment.name}`;
      imageIndex += 1;
      garmentImages.push(garment);
      return ref;
    });
    panelDescriptions.push(
      `Panel ${panelIndex + 1} ("${outfit.outfitName}"): use ${garmentRefs.join(", ")}`,
    );
  }

  const content: Record<string, unknown>[] = [
    {
      type: "text",
      text: `Write a detailed image-generation prompt for ONE photorealistic comparison image.

Image 1 is the person photo and must remain the identity reference for every panel.
The remaining images are garment references mapped to outfits below.

${panelDescriptions.join("\n")}

Create ONE image with ${outfits.length} equal vertical panels side by side (a clean outfit comparison).
The same person must appear in each panel with matching face, hair, eyewear, skin tone, build,
and a consistent studio-style background. Only the clothing changes between panels.
Each panel must show a full-body or three-quarter view wearing exactly its assigned garments.
Do not add text, labels, borders, or watermarks in the image.
Preserve exact garment colours, silhouettes, sleeve lengths, necklines, and patterns from references.

Return only the final image-generation prompt.`,
    },
    { type: "image_url", image_url: { url: personImage } },
    ...garmentImages.map((garment) => ({
      type: "image_url",
      image_url: { url: garment.imageUrl },
    })),
  ];

  const generationPrompt = await requestGenerationPrompt(content);
  const garmentConstraint = outfits
    .map((outfit) => `${outfit.outfitName}: ${outfit.garments.map((g) => g.name).join(", ")}`)
    .join(" | ");
  const imageUrl = await requestGeneratedImage(generationPrompt, garmentConstraint);

  return {
    imageUrl,
    outfitNames: outfits.map((outfit) => outfit.outfitName),
    note: "Comparison image showing your selected outfits side by side.",
  };
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
    const personError = validatePersonImage(personImage);
    if (personError) {
      return c.json({ error: personError }, personError.includes("5 MB") ? 413 : 400);
    }

    const comparisonOutfits = getOutfitReferences(body.outfits).slice(
      0,
      MAX_COMPARISON_OUTFITS,
    );

    if (comparisonOutfits.length > 1) {
      const result = await runComparisonTryOn(personImage, comparisonOutfits);
      return c.json(result);
    }

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

    if (comparisonOutfits.length === 1) {
      const result = await runSingleOutfitTryOn(
        personImage,
        comparisonOutfits[0].garments,
        comparisonOutfits[0].outfitName,
      );
      return c.json(result);
    }

    if (garments.length === 0) {
      return c.json(
        { error: "At least one selected garment image is required" },
        400,
      );
    }

    const result = await runSingleOutfitTryOn(personImage, garments, outfitName);
    return c.json(result);
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
