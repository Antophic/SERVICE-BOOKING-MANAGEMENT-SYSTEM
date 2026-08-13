import { Router } from "express";
import type { DataStore } from "../repositories/types.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function createScheduleRouter(store: DataStore) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (request, response) => {
      const date = typeof request.query.date === "string" ? request.query.date : undefined;
      response.json({ schedule: await store.getSchedule(date) });
    }),
  );

  return router;
}
