import { Router } from "express";
import { retryJobItem } from "../controllers/job-item.controller.js";

export const jobItemRouter = Router();
jobItemRouter.post("/:jobItemId/retry", retryJobItem);
