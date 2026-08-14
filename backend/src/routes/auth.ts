import bcrypt from "bcryptjs";
import { Router } from "express";
import { cookieOptions, env } from "../config/env.js";
import type { DataStore } from "../repositories/types.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { toPublicUser } from "../utils/publicUser.js";
import { createCsrfToken, csrfCookieOptions } from "../middlewares/csrf.js";
import { getRequiredUser, requireAuth, signAuthToken } from "../middlewares/auth.js";
import { loginSchema } from "../validators/schemas.js";

export function createAuthRouter(store: DataStore) {
  const router = Router();

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const input = loginSchema.parse(request.body);
      const user = await store.findUserByEmail(input.email);

      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new ApiError(401, "Invalid email or password.");
      }

      const csrfToken = createCsrfToken();
      const token = signAuthToken({ sub: user.id, role: user.role });

      response.cookie(env.COOKIE_NAME, token, cookieOptions);
      response.cookie(env.CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
      response.json({ user: toPublicUser(user), csrfToken });
    }),
  );

  router.post("/logout", (_request, response) => {
    response.clearCookie(env.COOKIE_NAME, { path: "/" });
    response.clearCookie(env.CSRF_COOKIE_NAME, { path: "/" });
    response.json({ message: "Logged out." });
  });

  router.get("/me", requireAuth, (request, response) => {
    const csrfToken = request.cookies?.[env.CSRF_COOKIE_NAME] ?? createCsrfToken();

    response.cookie(env.CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
    response.json({ user: getRequiredUser(request), csrfToken });
  });

  return router;
}
