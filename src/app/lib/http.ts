export async function readResponsePayload(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return { data: null as unknown, rawText: "" };
  }

  try {
    return { data: JSON.parse(text) as unknown, rawText: text };
  } catch {
    return { data: null as unknown, rawText: text };
  }
}

export function httpErrorMessage(
  response: Response,
  rawText: string,
  fallback: string,
) {
  if (response.status === 504 || rawText.startsWith("An error occurred")) {
    return "The server timed out while processing your request. Please try again.";
  }

  if (rawText.trim()) {
    return rawText.length > 180 ? `${rawText.slice(0, 180)}…` : rawText;
  }

  return fallback;
}
