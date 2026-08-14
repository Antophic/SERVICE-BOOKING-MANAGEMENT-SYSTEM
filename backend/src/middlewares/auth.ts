import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { DataStore } from "../repositories/types.js";
import type { PublicUser, Role } from "../types/domain.js";
import { ApiError } from "../utils/ApiError.js";
import { toPublicUser } from "../utils/publicUser.js";

type AuthTokenPayload = {
  sub: string;
  role: Role;
};

type RequestWithUser = Request & {
  user?: PublicUser;
};

export function getRequestUser(request: Request) {
  return (request as RequestWithUser).user;
}

export function getRequiredUser(request: Request) {
  const user = getRequestUser(request);
  if (!user) {
    throw new ApiError(401, "Authentication required.");
  }

  return user;
}

function setRequestUser(request: Request, user: PublicUser | undefined) {
  (request as RequestWithUser).user = user;
}

export function signAuthToken(payload: AuthTokenPayload) {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    ...options,
  });
}

export function createAuthMiddleware(store: DataStore) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    const token = request.cookies?.[env.COOKIE_NAME];

    if (!token) {
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
      const user = await store.findUserById(decoded.sub);
      setRequestUser(request, user ? toPublicUser(user) : undefined);
      next();
    } catch {
      next();
    }
  };
}

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  if (!getRequestUser(request)) {
    next(new ApiError(401, "Authentication required."));
    return;
  }

  next();
}

export function requireRole(role: Role) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const user = getRequestUser(request);

    if (!user) {
      next(new ApiError(401, "Authentication required."));
      return;
    }

    if (user.role !== role) {
      next(new ApiError(403, "You do not have permission to perform this action."));
      return;
    }

    next();
  };
}
