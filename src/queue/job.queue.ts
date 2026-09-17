import { Queue } from "bullmq";
import { createRedisConnection } from "./connection.js";

export const URL_PULSE_QUEUE = "urlpulse-job-items";
export const jobQueue = new Queue<{ jobItemId: string }>(URL_PULSE_QUEUE, { connection: createRedisConnection() });

export async function enqueueJobItem(jobItemId: string, replace = false): Promise<void> {
  // BullMQ reserves ':' for internal Redis key segments.
  const jobId = `job-item-${jobItemId}`;
  if (replace) {
    const prior = await jobQueue.getJob(jobId);
    if (prior) await prior.remove();
  }
  await jobQueue.add("process-job-item", { jobItemId }, { jobId, removeOnComplete: 1_000, removeOnFail: 1_000 });
}
