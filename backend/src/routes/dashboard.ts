import { Router } from "express";
import type { DataStore } from "../repositories/types.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { todayDateString } from "../utils/time.js";

export function createDashboardRouter(store: DataStore) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (_request, response) => {
      response.json({ metrics: await store.getDashboardMetrics(todayDateString()) });
    }),
  );

  return router;
}
