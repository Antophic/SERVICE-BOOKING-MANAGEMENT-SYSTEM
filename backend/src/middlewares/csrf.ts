import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { getRequestUser } from "./auth.js";

export function createCsrfToken() {
  return randomBytes(24).toString("hex");
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === "production" || env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    path: "/",
  } as const;
}

export function requireCsrf(request: Request, _response: Response, next: NextFunction) {
  if (!getRequestUser(request) || ["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const cookieToken = request.cookies?.[env.CSRF_COOKIE_NAME];
  const headerToken = request.get(env.CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new ApiError(403, "Security token is missing or invalid."));
    return;
  }

  next();
}
