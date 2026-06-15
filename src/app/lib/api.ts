import { assertSupabaseConfig, supabaseAnonKey, supabaseProjectUrl } from "./supabaseConfig";

assertSupabaseConfig();
const BASE = `${supabaseProjectUrl}/functions/v1/make-server-09284421`;

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? supabaseAnonKey}`,
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export const api = {
  // Auth
  signup: (name: string, email: string, password: string) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  signin: (email: string, password: string) =>
    request("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) }),

  bootstrapProfile: (token: string) =>
    request("/auth/bootstrap", { method: "POST", body: "{}" }, token),

  // Profile
  getProfile: (token: string) =>
    request("/profile", {}, token),

  updateProfile: (token: string, updates: object) =>
    request("/profile", { method: "PUT", body: JSON.stringify(updates) }, token),

  // Wardrobe
  getWardrobe: (token: string) =>
    request("/wardrobe", {}, token),

  addWardrobeItem: (token: string, item: object) =>
    request("/wardrobe", { method: "POST", body: JSON.stringify(item) }, token),

  updateWardrobeItem: (token: string, id: string, updates: object) =>
    request(`/wardrobe/${id}`, { method: "PUT", body: JSON.stringify(updates) }, token),

  deleteWardrobeItem: (token: string, id: string) =>
    request(`/wardrobe/${id}`, { method: "DELETE" }, token),

  // Outfits
  getOutfits: (token: string) =>
    request("/outfits", {}, token),

  saveOutfit: (token: string, outfit: object) =>
    request("/outfits", { method: "POST", body: JSON.stringify(outfit) }, token),

  likeOutfit: (token: string, id: string, liked: boolean) =>
    request(`/outfits/${id}/like`, { method: "PUT", body: JSON.stringify({ liked }) }, token),

  // Jams
  getJams: (token: string) =>
    request("/jams", {}, token),

  createJam: (token: string, jam: object) =>
    request("/jams", { method: "POST", body: JSON.stringify(jam) }, token),

  joinJam: (token: string, code: string) =>
    request("/jams/join", { method: "POST", body: JSON.stringify({ code }) }, token),

  updateJam: (token: string, id: string, updates: object) =>
    request(`/jams/${id}`, { method: "PUT", body: JSON.stringify(updates) }, token),

  // Cart
  getCart: (token: string) =>
    request("/cart", {}, token),

  updateCart: (token: string, items: object[]) =>
    request("/cart", { method: "PUT", body: JSON.stringify({ items }) }, token),

  clearCart: (token: string) =>
    request("/cart", { method: "DELETE" }, token),

  uploadClothingImage: async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE}/storage/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Image upload failed");
    return data as { imageUrl: string; path?: string };
  },
};
