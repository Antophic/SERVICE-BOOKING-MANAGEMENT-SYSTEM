import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import type { DataStore } from "../repositories/types.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicBookingSchema } from "../validators/schemas.js";

export function createPublicBookingsRouter(store: DataStore) {
  const router = Router();

  const publicBookingLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.PUBLIC_BOOKING_RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many booking requests. Please try again later." },
  });

  router.post(
    "/bookings",
    publicBookingLimiter,
    asyncHandler(async (request, response) => {
      const input = publicBookingSchema.parse(request.body);
      const booking = await store.createPublicBooking(input);

      response.status(201).json({
        message: "Booking created.",
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          customerName: booking.customer.name,
          status: booking.status,
        },
      });
    }),
  );

  return router;
}
