import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../backend/src/app.js";
import { createDataStore } from "../backend/src/repositories/index.js";

let appPromise: Promise<ReturnType<typeof createApp>> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const store = createDataStore();
      await store.ready();
      return createApp(store);
    })();
  }

  return appPromise;
}

function restoreApiPathForExpress(request: IncomingMessage) {
  if (!request.url) return;

  const url = new URL(request.url, "https://serviceflow.local");
  const apiPath = url.searchParams.get("__api_path");
  if (!apiPath) return;

  url.searchParams.delete("__api_path");

  const normalizedPath = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const query = url.searchParams.toString();
  request.url = `/api${normalizedPath}${query ? `?${query}` : ""}`;
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  restoreApiPathForExpress(request);

  const app = await getApp();
  app(request, response);
}
