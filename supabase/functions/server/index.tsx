import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["Content-Length"], maxAge: 600 }));

function adminClient() { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); }
function anonClient()  { return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!); }
async function getUser(authHeader: string | null) {
  if (!authHeader) return null;
  const { data: { user } } = await anonClient().auth.getUser(authHeader.replace("Bearer ", ""));
  return user;
}

app.get("/make-server-09284421/health", (c) => c.json({ status: "ok" }));

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post("/make-server-09284421/auth/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    const { data, error } = await adminClient().auth.admin.createUser({ email, password, user_metadata: { name }, email_confirm: true });
    if (error) return c.json({ error: error.message }, 400);
    await kv.set(`profile:${data.user.id}`, { id: data.user.id, name, email, undertone: null, season: null, skinTone: null, palette: [], avoidColours: [], measurements: {}, sizes: {}, bodyShape: null, createdAt: new Date().toISOString() });
    return c.json({ user: data.user });
  } catch (err) { console.log("Signup error:", err); return c.json({ error: String(err) }, 500); }
});

app.post("/make-server-09284421/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    if (error) return c.json({ error: error.message }, 401);
    return c.json({ session: data.session, user: data.user });
  } catch (err) { console.log("Signin error:", err); return c.json({ error: String(err) }, 500); }
});

// ── PROFILE ───────────────────────────────────────────────────────────────────
app.get("/make-server-09284421/profile", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const profile = await kv.get(`profile:${user.id}`);
    return c.json({ profile: profile ?? { id: user.id, name: user.user_metadata?.name, email: user.email } });
  } catch (err) { console.log("Get profile error:", err); return c.json({ error: String(err) }, 500); }
});

app.put("/make-server-09284421/profile", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const updates = await c.req.json();
    const existing = (await kv.get(`profile:${user.id}`)) ?? {};
    const merged = { ...existing, ...updates, id: user.id, updatedAt: new Date().toISOString() };
    await kv.set(`profile:${user.id}`, merged);
    return c.json({ profile: merged });
  } catch (err) { console.log("Update profile error:", err); return c.json({ error: String(err) }, 500); }
});

// ── WARDROBE ──────────────────────────────────────────────────────────────────
app.get("/make-server-09284421/wardrobe", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const items = await kv.getByPrefix(`wardrobe:${user.id}:`);
    return c.json({ items });
  } catch (err) { console.log("Get wardrobe error:", err); return c.json({ error: String(err) }, 500); }
});

app.post("/make-server-09284421/wardrobe", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const item = await c.req.json();
    const id = crypto.randomUUID();
    const newItem = { ...item, id, userId: user.id, worn: 0, createdAt: new Date().toISOString() };
    await kv.set(`wardrobe:${user.id}:${id}`, newItem);
    return c.json({ item: newItem });
  } catch (err) { console.log("Add wardrobe item error:", err); return c.json({ error: String(err) }, 500); }
});

app.put("/make-server-09284421/wardrobe/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`wardrobe:${user.id}:${id}`);
    if (!existing) return c.json({ error: "Item not found" }, 404);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`wardrobe:${user.id}:${id}`, updated);
    return c.json({ item: updated });
  } catch (err) { console.log("Update wardrobe item error:", err); return c.json({ error: String(err) }, 500); }
});

app.delete("/make-server-09284421/wardrobe/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    await kv.del(`wardrobe:${user.id}:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) { console.log("Delete wardrobe item error:", err); return c.json({ error: String(err) }, 500); }
});

// ── OUTFITS ───────────────────────────────────────────────────────────────────
app.get("/make-server-09284421/outfits", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const outfits = await kv.getByPrefix(`outfit:${user.id}:`);
    return c.json({ outfits });
  } catch (err) { console.log("Get outfits error:", err); return c.json({ error: String(err) }, 500); }
});

app.post("/make-server-09284421/outfits", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const outfit = await c.req.json();
    const id = crypto.randomUUID();
    const newOutfit = { ...outfit, id, userId: user.id, liked: false, createdAt: new Date().toISOString() };
    await kv.set(`outfit:${user.id}:${id}`, newOutfit);
    return c.json({ outfit: newOutfit });
  } catch (err) { console.log("Save outfit error:", err); return c.json({ error: String(err) }, 500); }
});

app.put("/make-server-09284421/outfits/:id/like", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const { liked } = await c.req.json();
    const existing = await kv.get(`outfit:${user.id}:${id}`);
    if (!existing) return c.json({ error: "Outfit not found" }, 404);
    const updated = { ...existing, liked };
    await kv.set(`outfit:${user.id}:${id}`, updated);
    return c.json({ outfit: updated });
  } catch (err) { console.log("Like outfit error:", err); return c.json({ error: String(err) }, 500); }
});

// ── JAMS ──────────────────────────────────────────────────────────────────────
app.post("/make-server-09284421/jams", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { eventName, date, location, prompt, vibe } = await c.req.json();
    const id = crypto.randomUUID();
    const code = "STYLE-" + Math.floor(1000 + Math.random() * 9000);
    const profile = (await kv.get(`profile:${user.id}`)) as any ?? {};
    const jam = { id, code, eventName, date, location, prompt, vibe, hostId: user.id, hostName: profile.name ?? "Host", members: [{ userId: user.id, name: profile.name ?? "Host", avatar: profile.photoUrl ?? null, items: 0, status: "host" }], createdAt: new Date().toISOString() };
    await kv.set(`jam:${id}`, jam);
    await kv.set(`jam-member:${user.id}:${id}`, { jamId: id, code });
    return c.json({ jam });
  } catch (err) { console.log("Create jam error:", err); return c.json({ error: String(err) }, 500); }
});

app.post("/make-server-09284421/jams/join", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { code } = await c.req.json();
    const allJams = await kv.getByPrefix("jam:") as any[];
    const jam = allJams.find((j: any) => j?.code === code);
    if (!jam) return c.json({ error: "Jam not found" }, 404);
    const profile = (await kv.get(`profile:${user.id}`)) as any ?? {};
    if (!jam.members?.some((m: any) => m.userId === user.id)) {
      jam.members = [...(jam.members ?? []), { userId: user.id, name: profile.name ?? "Member", avatar: profile.photoUrl ?? null, items: 0, status: "pending" }];
      await kv.set(`jam:${jam.id}`, jam);
      await kv.set(`jam-member:${user.id}:${jam.id}`, { jamId: jam.id, code });
    }
    return c.json({ jam });
  } catch (err) { console.log("Join jam error:", err); return c.json({ error: String(err) }, 500); }
});

app.get("/make-server-09284421/jams", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const memberships = await kv.getByPrefix(`jam-member:${user.id}:`) as any[];
    const jams = await Promise.all(memberships.map((m: any) => kv.get(`jam:${m?.jamId}`)));
    return c.json({ jams: jams.filter(Boolean) });
  } catch (err) { console.log("Get jams error:", err); return c.json({ error: String(err) }, 500); }
});

app.put("/make-server-09284421/jams/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`jam:${id}`) as any;
    if (!existing) return c.json({ error: "Jam not found" }, 404);
    if (existing.hostId !== user.id) return c.json({ error: "Only host can edit" }, 403);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await kv.set(`jam:${id}`, updated);
    return c.json({ jam: updated });
  } catch (err) { console.log("Update jam error:", err); return c.json({ error: String(err) }, 500); }
});

// ── CART ──────────────────────────────────────────────────────────────────────
app.get("/make-server-09284421/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    return c.json({ cart: (await kv.get(`cart:${user.id}`)) ?? { items: [] } });
  } catch (err) { console.log("Get cart error:", err); return c.json({ error: String(err) }, 500); }
});

app.put("/make-server-09284421/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { items } = await c.req.json();
    const cart = { items, updatedAt: new Date().toISOString() };
    await kv.set(`cart:${user.id}`, cart);
    return c.json({ cart });
  } catch (err) { console.log("Update cart error:", err); return c.json({ error: String(err) }, 500); }
});

app.delete("/make-server-09284421/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    await kv.set(`cart:${user.id}`, { items: [] });
    return c.json({ success: true });
  } catch (err) { console.log("Clear cart error:", err); return c.json({ error: String(err) }, 500); }
});

Deno.serve(app.fetch);
