import multer from "multer";
import { AppError } from "../errors/app-error.js";

// Adapted from the existing createFileUploadMiddleware factory; memory storage avoids orphaned upload files.
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = [".csv", ".xlsx", ".xls"];
    const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(extension)) return callback(new AppError(400, "Only CSV, XLS, and XLSX files are supported", "INVALID_FILE"));
    return callback(null, true);
  },
});

export const uploadUrlFile = uploader.single("file");
