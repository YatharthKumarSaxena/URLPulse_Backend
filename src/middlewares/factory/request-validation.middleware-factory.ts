import type { RequestHandler } from "express";
import { AppError } from "../../errors/app-error.js";

type Location = "body" | "params" | "query";
type Rule = { optional?: boolean; validate: (value: unknown) => string | undefined };

// TypeScript adaptation of the prior project's generic presence and field-validation factories.
export const checkPresence = (location: Location, fields: readonly string[]): RequestHandler => (req, _res, next) => {
  const record = req[location] as Record<string, unknown> | undefined;
  const missing = fields.filter((field) => {
    const value = record?.[field];
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
  });
  if (missing.length > 0) return next(new AppError(400, `Missing required fields: ${missing.join(", ")}`, "MISSING_FIELDS"));
  if (record) {
    for (const field of fields) if (typeof record[field] === "string") record[field] = (record[field] as string).trim();
  }
  return next();
};

export const validateFields = (location: Location, rules: Record<string, Rule>): RequestHandler => (req, _res, next) => {
  const record = req[location] as Record<string, unknown> | undefined;
  const errors: { field: string; message: string }[] = [];
  for (const [field, rule] of Object.entries(rules)) {
    const value = record?.[field];
    if (value === undefined || value === null || value === "") {
      if (!rule.optional) errors.push({ field, message: `${field} is required` });
      continue;
    }
    const message = rule.validate(value);
    if (message) errors.push({ field, message });
  }
  return errors.length ? next(new AppError(400, errors.map((error) => error.message).join(", "), "VALIDATION_ERROR")) : next();
};

export const positiveInteger = (max: number) => (value: unknown): string | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0 && value <= max
    ? undefined
    : `count must be a positive integer no greater than ${max}`;

export const nonEmptyString = (field: string) => (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? undefined : `${field} must be a non-empty string`;
