import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  JWT_SECRET: z.string().min(16).default("local_dev_secret_replace_before_production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("serviceflow_session"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  CSRF_COOKIE_NAME: z.string().default("serviceflow_csrf"),
  CSRF_HEADER_NAME: z.string().default("x-csrf-token"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  PUBLIC_BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  BUSINESS_TIMEZONE: z.string().default("Asia/Jakarta"),
  DATA_STORE: z.enum(["memory", "prisma"]).default("memory"),
  DATABASE_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production" || env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: "/",
} as const;
