import type { PublicUser } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: PublicUser;
  }
}

export {};
