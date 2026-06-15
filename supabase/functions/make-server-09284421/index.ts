import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const FUNCTION_NAME = "make-server-09284421";
const app = new Hono().basePath(`/${FUNCTION_NAME}`);
app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function anonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
}

async function getUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await anonClient().auth.getUser(token);
  return user;
}

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/auth/signup", async (c) => {
  try {
    const { name, email, password } = await c.req.json();
    const { data, error } = await adminClient().auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);
    await kv.set(`profile:${data.user.id}`, {
      id: data.user.id,
      name,
      email,
      undertone: null,
      season: null,
      skinTone: null,
      palette: [],
      avoidColours: [],
      measurements: {},
      sizes: {},
      bodyShape: null,
      createdAt: new Date().toISOString(),
    });
    return c.json({ user: data.user });
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await anonClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) return c.json({ error: error.message }, 401);
    return c.json({ session: data.session, user: data.user });
  } catch (err) {
    console.log("Signin error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/auth/bootstrap", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const existing = await kv.get(`profile:${user.id}`);
    if (existing) return c.json({ profile: existing });

    const metadata = user.user_metadata ?? {};
    const name =
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      user.email?.split("@")[0] ||
      "User";
    const photoUrl =
      (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
      (typeof metadata.picture === "string" && metadata.picture) ||
      null;

    const profile = {
      id: user.id,
      name,
      email: user.email,
      photoUrl,
      undertone: null,
      season: null,
      skinTone: null,
      palette: [],
      avoidColours: [],
      measurements: {},
      sizes: {},
      bodyShape: null,
      styleAdvice: null,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`profile:${user.id}`, profile);
    return c.json({ profile });
  } catch (err) {
    console.log("Bootstrap profile error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/profile", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const profile = await kv.get(`profile:${user.id}`);
    return c.json({
      profile: profile ?? {
        id: user.id,
        name: user.user_metadata?.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.log("Get profile error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/profile", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const updates = await c.req.json();
    const existing = (await kv.get(`profile:${user.id}`)) ?? {};
    const merged = {
      ...existing,
      ...updates,
      id: user.id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`profile:${user.id}`, merged);
    return c.json({ profile: merged });
  } catch (err) {
    console.log("Update profile error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/wardrobe", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const items = await kv.getByPrefix(`wardrobe:${user.id}:`);
    return c.json({ items });
  } catch (err) {
    console.log("Get wardrobe error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/wardrobe", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const item = await c.req.json();
    const id = crypto.randomUUID();
    const newItem = {
      ...item,
      id,
      userId: user.id,
      worn: 0,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`wardrobe:${user.id}:${id}`, newItem);
    return c.json({ item: newItem });
  } catch (err) {
    console.log("Add wardrobe item error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/wardrobe/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`wardrobe:${user.id}:${id}`);
    if (!existing) return c.json({ error: "Item not found" }, 404);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`wardrobe:${user.id}:${id}`, updated);
    return c.json({ item: updated });
  } catch (err) {
    console.log("Update wardrobe item error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/wardrobe/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    await kv.del(`wardrobe:${user.id}:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (err) {
    console.log("Delete wardrobe item error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/outfits", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const outfits = await kv.getByPrefix(`outfit:${user.id}:`);
    return c.json({ outfits });
  } catch (err) {
    console.log("Get outfits error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/outfits", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const outfit = await c.req.json();
    const id = crypto.randomUUID();
    const newOutfit = {
      ...outfit,
      id,
      userId: user.id,
      liked: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`outfit:${user.id}:${id}`, newOutfit);
    return c.json({ outfit: newOutfit });
  } catch (err) {
    console.log("Save outfit error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/outfits/:id/like", async (c) => {
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
  } catch (err) {
    console.log("Like outfit error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/jams", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { eventName, date, location, prompt, vibe } = await c.req.json();
    const id = crypto.randomUUID();
    const code = "STYLE-" + Math.floor(1000 + Math.random() * 9000);
    const profile = (await kv.get(`profile:${user.id}`)) as Record<string, unknown> ?? {};
    const jam = {
      id,
      code,
      eventName,
      date,
      location,
      prompt,
      vibe,
      hostId: user.id,
      hostName: profile.name ?? "Host",
      members: [{
        userId: user.id,
        name: profile.name ?? "Host",
        avatar: profile.photoUrl ?? null,
        items: 0,
        status: "host",
      }],
      createdAt: new Date().toISOString(),
    };
    await kv.set(`jam:${id}`, jam);
    await kv.set(`jam-member:${user.id}:${id}`, { jamId: id, code });
    return c.json({ jam });
  } catch (err) {
    console.log("Create jam error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/jams/join", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { code } = await c.req.json();
    const allJams = await kv.getByPrefix("jam:") as Array<Record<string, unknown>>;
    const jam = allJams.find((j) => j?.code === code);
    if (!jam) return c.json({ error: "Jam not found" }, 404);
    const profile = (await kv.get(`profile:${user.id}`)) as Record<string, unknown> ?? {};
    const members = jam.members as Array<Record<string, unknown>> | undefined;
    if (!members?.some((m) => m.userId === user.id)) {
      jam.members = [
        ...(members ?? []),
        {
          userId: user.id,
          name: profile.name ?? "Member",
          avatar: profile.photoUrl ?? null,
          items: 0,
          status: "pending",
        },
      ];
      await kv.set(`jam:${jam.id}`, jam);
      await kv.set(`jam-member:${user.id}:${jam.id}`, { jamId: jam.id, code });
    }
    return c.json({ jam });
  } catch (err) {
    console.log("Join jam error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/jams", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const memberships = await kv.getByPrefix(`jam-member:${user.id}:`) as Array<Record<string, unknown>>;
    const jams = await Promise.all(
      memberships.map((m) => kv.get(`jam:${m?.jamId}`)),
    );
    return c.json({ jams: jams.filter(Boolean) });
  } catch (err) {
    console.log("Get jams error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/jams/:id", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const updates = await c.req.json();
    const existing = await kv.get(`jam:${id}`) as Record<string, unknown>;
    if (!existing) return c.json({ error: "Jam not found" }, 404);
    if (existing.hostId !== user.id) {
      return c.json({ error: "Only host can edit" }, 403);
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`jam:${id}`, updated);
    return c.json({ jam: updated });
  } catch (err) {
    console.log("Update jam error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    return c.json({
      cart: (await kv.get(`cart:${user.id}`)) ?? { items: [] },
    });
  } catch (err) {
    console.log("Get cart error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.put("/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { items } = await c.req.json();
    const cart = { items, updatedAt: new Date().toISOString() };
    await kv.set(`cart:${user.id}`, cart);
    return c.json({ cart });
  } catch (err) {
    console.log("Update cart error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

app.delete("/cart", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    await kv.set(`cart:${user.id}`, { items: [] });
    return c.json({ success: true });
  } catch (err) {
    console.log("Clear cart error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function imageExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

app.post("/storage/upload", async (c) => {
  try {
    const user = await getUser(c.req.header("Authorization") ?? null);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const formData = await c.req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "Missing image file" }, 400);
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return c.json({ error: "Please upload a JPEG, PNG, or WebP image" }, 400);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return c.json({ error: "Image must be 5 MB or smaller" }, 400);
    }

    const path = `${user.id}/${crypto.randomUUID()}.${
      imageExtension(file.type)
    }`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await adminClient().storage.from("Clothes").upload(
      path,
      bytes,
      { contentType: file.type, upsert: true },
    );
    if (error) {
      console.log("Storage upload error:", error);
      return c.json({ error: error.message }, 500);
    }

    const imageUrl = adminClient().storage.from("Clothes").getPublicUrl(path)
      .data.publicUrl;
    return c.json({ imageUrl, path });
  } catch (err) {
    console.log("Upload clothing image error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

Deno.serve(app.fetch);
