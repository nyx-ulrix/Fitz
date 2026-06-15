import { createApp } from "../server/app.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

const app = createApp();
const handler = app.fetch;

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
