import { z } from "zod";
import { isValidCalendarDate } from "../utils/time.js";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .refine(isValidCalendarDate, "Use a valid calendar date.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm time format.");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const publicBookingSchema = z.object({
  name: z.string().trim().min(2, "Full name is required."),
  email: z.string().trim().email("Enter a valid email address.").toLowerCase(),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  serviceId: z.string().trim().min(1, "Select a service."),
  scheduledDate: dateSchema,
  scheduledStartTime: timeSchema,
  address: z.string().trim().min(5, "Service address is required."),
  specialInstructions: z.string().trim().max(1000).optional().nullable(),
});

export const bookingFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  serviceId: z.string().trim().optional(),
  staffId: z.string().trim().optional(),
  date: dateSchema.optional(),
});

export const updateBookingSchema = z.object({
  serviceId: z.string().trim().min(1).optional(),
  scheduledDate: dateSchema.optional(),
  scheduledStartTime: timeSchema.optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  address: z.string().trim().min(5).optional(),
  specialInstructions: z.string().trim().max(1000).nullable().optional(),
  quotedPrice: z.number().nonnegative().optional(),
});

export const assignStaffSchema = z.object({
  staffId: z.string().trim().min(1, "Select a staff member."),
});

export const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});
