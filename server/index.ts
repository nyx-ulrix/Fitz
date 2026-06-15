import { serve } from "@hono/node-server";
import { API_PORT } from "./lib/env.js";
import { createApp } from "./app.js";

const app = createApp();

serve({ fetch: app.fetch, port: API_PORT }, (info) => {
  console.log(`Fitz API server listening on http://localhost:${info.port}`);
});
