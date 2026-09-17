import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { publishProgress } from "../events/progress.events.js";
import { BatchRepository } from "../repositories/batch.repository.js";
import { JobItemRepository } from "../repositories/job-item.repository.js";
import { createRedisConnection } from "./connection.js";
import { URL_PULSE_QUEUE } from "./job.queue.js";

const items = new JobItemRepository();
const batches = new BatchRepository();
const delay = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function checkUrl(url: string): Promise<{ status: "COMPLETED" | "FAILED"; httpStatusCode?: number; responseTimeMs: number; errorMessage?: string }> {
  const started = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(env.URL_CHECK_TIMEOUT_MS), redirect: "follow" });
    const responseTimeMs = Math.round(performance.now() - started);
    return response.ok
      ? { status: "COMPLETED", httpStatusCode: response.status, responseTimeMs }
      : { status: "FAILED", httpStatusCode: response.status, responseTimeMs, errorMessage: `HTTP ${response.status}` };
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - started);
    const message = error instanceof Error && error.name === "TimeoutError" ? "Request timed out" : error instanceof Error ? error.message : "URL health check failed";
    return { status: "FAILED", responseTimeMs, errorMessage: message };
  }
}

export const worker = new Worker<{ jobItemId: string }>(URL_PULSE_QUEUE, async (job) => {
  const item = await items.findById(job.data.jobItemId);
  if (!item || item.status !== "PENDING" || item.batch.status === "STOPPED") return;
  const processingItem = await items.markProcessing(item.id);
  if (!processingItem) return;
  await batches.markProcessing(item.batchId);
  const startedBatch = await batches.findWithProgress(item.batchId);
  await Promise.all([
    publishProgress({ batchId: item.batchId, type: "item", data: { jobItemId: item.id, status: "PROCESSING" } }),
    ...(startedBatch ? [publishProgress({ batchId: item.batchId, type: "progress", data: startedBatch })] : []),
  ]);

  const result = item.batch.mode === "SIMULATION"
    ? await (async () => {
      const responseTimeMs = 500 + Math.floor(Math.random() * 3_500);
      await delay(responseTimeMs);
      return Math.random() < 0.8
        ? { status: "COMPLETED" as const, responseTimeMs }
        : { status: "FAILED" as const, responseTimeMs, errorMessage: "Simulated processing failure" };
    })()
    : await checkUrl(item.url!);

  const currentItem = await items.findById(item.id);
  if (!currentItem || currentItem.status === "STOPPED" || currentItem.batch.status === "STOPPED") return;
  const finished = await items.markFinished(item.id, result.status, result);
  await batches.incrementFinalized(item.batchId, result.status);
  const batch = await batches.findWithProgress(item.batchId);
  await Promise.all([
    publishProgress({ batchId: item.batchId, type: "item", data: finished }),
    ...(batch ? [publishProgress({ batchId: item.batchId, type: "progress", data: batch })] : []),
  ]);
}, { connection: createRedisConnection(), concurrency: env.WORKER_CONCURRENCY });

worker.on("failed", (job, error) => console.error(`Queue job ${job?.id ?? "unknown"} failed`, error));
