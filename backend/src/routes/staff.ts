import { Router } from "express";
import type { DataStore } from "../repositories/types.js";
import { getRequiredUser, requireAuth, requireRole } from "../middlewares/auth.js";
import { requireCsrf } from "../middlewares/csrf.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { statusSchema } from "../validators/schemas.js";

function routeId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function createStaffRouter(store: DataStore) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (_request, response) => {
      response.json({ staff: await store.listStaff() });
    }),
  );

  router.get(
    "/me/bookings",
    requireAuth,
    requireRole("STAFF"),
    asyncHandler(async (request, response) => {
      const user = getRequiredUser(request);
      response.json({ bookings: await store.listAssignedBookings(user.id) });
    }),
  );

  router.get(
    "/me/bookings/:id",
    requireAuth,
    requireRole("STAFF"),
    asyncHandler(async (request, response) => {
      const user = getRequiredUser(request);
      const booking = await store.getAssignedBooking(user.id, routeId(request.params.id));
      if (!booking) throw new ApiError(404, "Booking not found.");
      response.json({ booking });
    }),
  );

  router.patch(
    "/me/bookings/:id/status",
    requireAuth,
    requireRole("STAFF"),
    requireCsrf,
    asyncHandler(async (request, response) => {
      const input = statusSchema.parse(request.body);
      const user = getRequiredUser(request);
      const booking = await store.updateBookingStatus(routeId(request.params.id), input.status, {
        id: user.id,
        role: user.role,
      });
      response.json({ message: "Job status updated.", booking });
    }),
  );

  return router;
}
