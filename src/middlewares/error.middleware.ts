import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../errors/app-error.js";

export const notFound: RequestHandler = (req, _res, next) => next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found`, "NOT_FOUND"));

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) error = new AppError(400, "Invalid JSON syntax in request body", "MALFORMED_JSON");
  if (error instanceof multer.MulterError) error = new AppError(400, error.message, "UPLOAD_ERROR");
  const known = error instanceof AppError;
  const status = known ? error.statusCode : 500;
  if (!known) console.error(error);
  return res.status(status).json({ success: false, message: known ? error.message : "Internal server error", code: known ? error.code : "INTERNAL_ERROR" });
};
