import * as XLSX from "xlsx";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

// Parser middleware follows the reference project's upload -> parser -> controller pipeline.
export const parseUrlFile: RequestHandler = (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "A file is required", "MISSING_FILE");
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const urls: string[] = [];
    for (const name of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, { header: 1, defval: "" });
      for (const row of rows) for (const cell of row) {
        if (typeof cell !== "string") continue;
        const candidate = cell.trim();
        try {
          const parsed = new URL(candidate);
          if (["http:", "https:"].includes(parsed.protocol)) urls.push(parsed.toString());
        } catch { /* non-URL cells such as headers are ignored */ }
      }
    }
    if (urls.length === 0) throw new AppError(400, "The file contains no valid HTTP/HTTPS URLs", "NO_VALID_URLS");
    if (urls.length > 1_000) throw new AppError(400, "A batch can contain at most 1000 URLs", "TOO_MANY_URLS");
    res.locals.urls = urls;
    return next();
  } catch (error) { return next(error); }
};
