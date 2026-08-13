import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json({
      message: "Please check the submitted information.",
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
  }

  response.status(500).json({
    message: "Something went wrong. Please try again.",
  });
};
