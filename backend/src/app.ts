import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { createAuthMiddleware } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import type { DataStore } from "./repositories/types.js";
import { createAuthRouter } from "./routes/auth.js";
import { createBookingsRouter } from "./routes/bookings.js";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createPublicBookingsRouter } from "./routes/publicBookings.js";
import { createScheduleRouter } from "./routes/schedule.js";
import { createServicesRouter } from "./routes/services.js";
import { createStaffRouter } from "./routes/staff.js";

export function createApp(store: DataStore) {
  const app = express();
  const allowedOrigins = new Set([
    env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ]);

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS."));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { message: "Too many requests. Please try again later." },
    }),
  );
  app.use(createAuthMiddleware(store));

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      dataStore: env.DATA_STORE,
      timezone: env.BUSINESS_TIMEZONE,
    });
  });

  app.use("/api/public", createPublicBookingsRouter(store));
  app.use("/api/auth", createAuthRouter(store));
  app.use("/api/services", createServicesRouter(store));
  app.use("/api/bookings", createBookingsRouter(store));
  app.use("/api/staff", createStaffRouter(store));
  app.use("/api/dashboard", createDashboardRouter(store));
  app.use("/api/schedule", createScheduleRouter(store));

  app.use(errorHandler);

  return app;
}
