import { createApp } from "../backend/src/app.js";
import { createDataStore } from "../backend/src/repositories/index.js";

const store = createDataStore();
await store.ready();

export default createApp(store);
