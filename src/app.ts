import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { batchRouter } from "./routes/batch.routes.js";
import { jobItemRouter } from "./routes/job-item.routes.js";
import { progressRouter } from "./routes/progress.routes.js";

export const app = express();
app.use(cors(env.FRONTEND_URL ? { origin: env.FRONTEND_URL } : undefined));
app.use(express.json({ limit: "1mb" }));
app.get("/health", (_req, res) => res.json({ success: true, data: { service: "urlpulse-api" } }));
app.use("/batches", batchRouter);
app.use("/job-items", jobItemRouter);
app.use(progressRouter);
app.use(notFound);
app.use(errorHandler);
