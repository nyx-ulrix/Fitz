import { Hono } from "hono";
import { cors } from "hono/cors";
import { weatherRoute } from "./routes/weather.js";
import { analyzeImageRoute } from "./routes/analyze-image.js";
import { outfitRoute } from "./routes/outfit.js";
import { tryOnRoute } from "./routes/try-on.js";
import { wardrobeRoute } from "./routes/wardrobe.js";
import { shopRoute } from "./routes/shop.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.get("/api/weather", weatherRoute);
  app.post("/api/analyze-image", analyzeImageRoute);
  app.post("/api/outfit", outfitRoute);
  app.post("/api/try-on", tryOnRoute);
  app.get("/api/wardrobe", wardrobeRoute);
  app.get("/api/shop", shopRoute);

  return app;
}
