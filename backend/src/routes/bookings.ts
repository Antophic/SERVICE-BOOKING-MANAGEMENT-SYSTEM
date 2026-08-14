import { Router } from "express";
import type { DataStore } from "../repositories/types.js";
import { getRequiredUser, requireAuth, requireRole } from "../middlewares/auth.js";
import { requireCsrf } from "../middlewares/csrf.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { assignStaffSchema, bookingFiltersSchema, statusSchema, updateBookingSchema } from "../validators/schemas.js";

function routeId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function createBookingsRouter(store: DataStore) {
  const router = Router();

  router.use(requireAuth, requireRole("ADMIN"));

  router.get(
    "/",
    asyncHandler(async (request, response) => {
      const filters = bookingFiltersSchema.parse(request.query);
      response.json(await store.listBookings(filters));
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const booking = await store.getBookingById(routeId(request.params.id));
      if (!booking) throw new ApiError(404, "Booking not found.");
      response.json({ booking });
    }),
  );

  router.patch(
    "/:id",
    requireCsrf,
    asyncHandler(async (request, response) => {
      const input = updateBookingSchema.parse(request.body);
      const user = getRequiredUser(request);
      const booking = await store.updateBooking(routeId(request.params.id), input, {
        id: user.id,
        role: user.role,
      });
      response.json({ message: "Booking updated.", booking });
    }),
  );

  router.delete(
    "/:id",
    requireCsrf,
    asyncHandler(async (request, response) => {
      const user = getRequiredUser(request);
      const booking = await store.updateBookingStatus(routeId(request.params.id), "CANCELLED", {
        id: user.id,
        role: user.role,
      });
      response.json({ message: "Booking cancelled.", booking });
    }),
  );

  router.patch(
    "/:id/assign",
    requireCsrf,
    asyncHandler(async (request, response) => {
      const input = assignStaffSchema.parse(request.body);
      const user = getRequiredUser(request);
      const booking = await store.assignStaff(routeId(request.params.id), input.staffId, {
        id: user.id,
        role: user.role,
      });
      response.json({ message: "Staff assigned.", booking });
    }),
  );

  router.patch(
    "/:id/status",
    requireCsrf,
    asyncHandler(async (request, response) => {
      const input = statusSchema.parse(request.body);
      const user = getRequiredUser(request);
      const booking = await store.updateBookingStatus(routeId(request.params.id), input.status, {
        id: user.id,
        role: user.role,
      });
      response.json({ message: "Booking status updated.", booking });
    }),
  );

  return router;
}
