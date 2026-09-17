import { Router } from "express";
import { streamBatchProgress } from "../controllers/progress.controller.js";

export const progressRouter = Router();
progressRouter.get("/batches/:batchId/events", streamBatchProgress);
