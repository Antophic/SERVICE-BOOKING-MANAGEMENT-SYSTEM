import { Router } from "express";
import type { DataStore } from "../repositories/types.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function createServicesRouter(store: DataStore) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json({ services: await store.listServices(true) });
    }),
  );

  return router;
}
