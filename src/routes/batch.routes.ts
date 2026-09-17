import { Router } from "express";
import { createSimulationBatch, createUrlHealthBatch, getBatch, getBatchHistory, getBatchItems, stopBatch } from "../controllers/batch.controller.js";
import { parseUrlFile } from "../middlewares/parse-url-file.middleware.js";
import { uploadUrlFile } from "../middlewares/file-upload.middleware.js";
import { checkPresence, positiveInteger, validateFields } from "../middlewares/factory/request-validation.middleware-factory.js";

export const batchRouter = Router();
batchRouter.post("/", checkPresence("body", ["count"]), validateFields("body", { count: { validate: positiveInteger(1_000) } }), createSimulationBatch);
batchRouter.post("/url-health", uploadUrlFile, parseUrlFile, createUrlHealthBatch);
batchRouter.get("/", getBatchHistory);
batchRouter.post("/:batchId/stop", stopBatch);
batchRouter.get("/:batchId", getBatch);
batchRouter.get("/:batchId/items", getBatchItems);
