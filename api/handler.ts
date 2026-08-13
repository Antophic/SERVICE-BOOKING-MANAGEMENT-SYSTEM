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

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const app = await getApp();
  app(request, response);
}
