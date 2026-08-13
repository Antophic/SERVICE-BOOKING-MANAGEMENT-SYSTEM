import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { createDataStore } from "./repositories/index.js";

const store = createDataStore();
await store.ready();

const app = createApp(store);
const server = app.listen(env.PORT, "127.0.0.1", () => {
  console.log(`ServiceFlow API running at http://127.0.0.1:${env.PORT}`);
});

const shutdown = async () => {
  server.close(async () => {
    await store.disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
