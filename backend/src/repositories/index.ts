import { env } from "../config/env.js";
import { MemoryStore } from "./memoryStore.js";
import { PrismaStore } from "./prismaStore.js";
import type { DataStore } from "./types.js";

export function createDataStore(): DataStore {
  if (env.DATA_STORE === "prisma") {
    return new PrismaStore();
  }

  return new MemoryStore();
}
