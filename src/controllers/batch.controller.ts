import type { RequestHandler } from "express";
import { BatchService } from "../services/batch.service.js";

const service = new BatchService();

export const getBatchHistory: RequestHandler = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 10));
    return res.json({ success: true, data: await service.listHistory(page, limit), meta: { page, limit } });
  } catch (error) { return next(error); }
};

export const createSimulationBatch: RequestHandler = async (req, res, next) => {
  try {
    const batch = await service.createSimulation(req.body.count as number);
    return res.status(201).json({ success: true, message: "Simulation batch created successfully", data: { batchId: batch.id, mode: batch.mode, total: batch.total } });
  } catch (error) { return next(error); }
};

export const createUrlHealthBatch: RequestHandler = async (_req, res, next) => {
  try {
    const batch = await service.createUrlHealth(res.locals.urls as string[]);
    return res.status(201).json({ success: true, message: "URL health batch created successfully", data: { batchId: batch.id, mode: batch.mode, total: batch.total } });
  } catch (error) { return next(error); }
};

export const getBatch: RequestHandler = async (req, res, next) => {
  try {
    const batchId = Array.isArray(req.params.batchId) ? req.params.batchId[0]! : req.params.batchId!;
    return res.json({ success: true, data: await service.getBatch(batchId) });
  } catch (error) { return next(error); }
};

export const stopBatch: RequestHandler = async (req, res, next) => {
  try {
    const batchId = Array.isArray(req.params.batchId) ? req.params.batchId[0]! : req.params.batchId!;
    return res.json({ success: true, data: await service.stop(batchId) });
  } catch (error) { return next(error); }
};

export const getBatchItems: RequestHandler = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const batchId = Array.isArray(req.params.batchId) ? req.params.batchId[0]! : req.params.batchId!;
    return res.json({ success: true, data: await service.listItems(batchId, page, limit), meta: { page, limit } });
  } catch (error) { return next(error); }
};
