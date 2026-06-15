import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./images";
import { api } from "./api";
import { supabase } from "./supabaseClient";

export function validateGarmentImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Please choose JPEG, PNG, or WebP images only.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Each image must be 5 MB or smaller.";
  }
  return null;
}

export function nameFromFile(file: File) {
  return file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function requireAccessToken() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  if (!session?.access_token) {
    throw new Error("Sign in again to upload images.");
  }
  return session.access_token;
}

/** Upload via edge function (service role) — avoids client storage RLS issues. */
export async function uploadGarmentImage(_userId: string, file: File) {
  const validationError = validateGarmentImage(file);
  if (validationError) throw new Error(validationError);

  const token = await requireAccessToken();
  const { imageUrl } = await api.uploadClothingImage(token, file);
  return imageUrl;
}
