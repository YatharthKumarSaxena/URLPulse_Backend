import type { RequestHandler } from "express";
import { BatchService } from "../services/batch.service.js";

const service = new BatchService();
export const retryJobItem: RequestHandler = async (req, res, next) => {
  try {
    const param = req.params.jobItemId;
    const jobItemId = await service.retry(Array.isArray(param) ? param[0]! : param!);
    return res.status(202).json({ success: true, message: "Job item queued for retry", data: { jobItemId } });
  } catch (error) { return next(error); }
};
