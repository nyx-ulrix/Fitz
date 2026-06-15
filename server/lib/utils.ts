export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAssistantText(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.choices) ||
    !isRecord(value.choices[0]) ||
    !isRecord(value.choices[0].message)
  ) {
    return null;
  }

  return typeof value.choices[0].message.content === "string"
    ? value.choices[0].message.content
    : null;
}

export function parseJsonResponse(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(cleaned) as unknown;
}

export function estimateDataUrlBytes(dataUrl: string) {
  const encoded = dataUrl.split(",", 2)[1] ?? "";
  return Math.ceil((encoded.length * 3) / 4);
}

export function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function findImageInValue(value: unknown): string | null {
  if (typeof value === "string") {
    if (/^data:image\//i.test(value) || /^https?:\/\/\S+/i.test(value)) {
      return value;
    }

    try {
      return findImageInValue(JSON.parse(value));
    } catch {
      const markdownImage = value.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
      return markdownImage?.[1] ?? null;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = findImageInValue(entry);
      if (image) return image;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const key of [
    "imageUrl",
    "image_url",
    "url",
    "b64_json",
    "data",
    "images",
    "content",
    "choices",
    "message",
  ]) {
    if (!(key in value)) continue;

    if (key === "b64_json" && typeof value[key] === "string") {
      return `data:image/png;base64,${value[key]}`;
    }

    const image = findImageInValue(value[key]);
    if (image) return image;
  }

  return null;
}
