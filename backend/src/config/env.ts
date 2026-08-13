import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const dataStoreDefault = process.env.NODE_ENV === "production" ? "prisma" : "memory";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://127.0.0.1:5173"),
  ADDITIONAL_CORS_ORIGINS: z.string().default(""),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16).default("local_dev_secret_replace_before_production"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  COOKIE_NAME: z.string().default("serviceflow_session"),
  COOKIE_SECURE: booleanFromEnv.default(false),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  CSRF_COOKIE_NAME: z.string().default("serviceflow_csrf"),
  CSRF_HEADER_NAME: z.string().default("x-csrf-token"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  PUBLIC_BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  BUSINESS_TIMEZONE: z.string().default("Asia/Jakarta"),
  DATA_STORE: z.enum(["memory", "prisma"]).default(dataStoreDefault),
  DATABASE_URL: z.string().optional(),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.JWT_SECRET === "local_dev_secret_replace_before_production") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "Set a strong JWT_SECRET before running in production.",
    });
  }

  if (value.DATA_STORE === "prisma" && !value.DATABASE_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message: "DATABASE_URL is required when DATA_STORE=prisma.",
    });
  }
});

export const env = envSchema.parse(process.env);

function normalizeOrigin(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  return `https://${normalized}`;
}

export function getAllowedClientOrigins() {
  const origins = [
    env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    normalizeOrigin(env.VERCEL_URL),
    normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL),
    ...env.ADDITIONAL_CORS_ORIGINS.split(",").map((origin) => normalizeOrigin(origin)),
  ].filter((origin): origin is string => Boolean(origin));

  return new Set(origins);
}

export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production" || env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: "/",
} as const;
