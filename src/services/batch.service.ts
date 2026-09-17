import { type Batch, BatchMode } from "@prisma/client";
import { AppError } from "../errors/app-error.js";
import { publishProgress } from "../events/progress.events.js";
import { BatchRepository } from "../repositories/batch.repository.js";
import { JobItemRepository } from "../repositories/job-item.repository.js";
import { enqueueJobItem } from "../queue/job.queue.js";

export class BatchService {
  public constructor(private readonly batches = new BatchRepository(), private readonly items = new JobItemRepository()) {}

  public async createSimulation(count: number): Promise<Batch> { return this.create(BatchMode.SIMULATION, Array.from({ length: count }, () => "")); }
  public async createUrlHealth(urls: string[]): Promise<Batch> { return this.create(BatchMode.URL_HEALTH, urls); }

  private async create(mode: BatchMode, inputs: string[]): Promise<Batch> {
    const batch = await this.batches.create(mode, inputs.length);
    await this.items.createMany(batch.id, inputs);
    const created = await this.items.findByBatchId(batch.id, 1, inputs.length);
    await Promise.all(created.items.map((item) => enqueueJobItem(item.id)));
    return batch;
  }

  public async getBatch(id: string) {
    const batch = await this.batches.findWithProgress(id);
    if (!batch) throw new AppError(404, "Batch not found", "BATCH_NOT_FOUND");
    return batch;
  }

  public listHistory(page = 1, limit = 10) {
    return this.batches.findHistory(page, limit);
  }

  public async listItems(batchId: string, page: number, limit: number) {
    if (!(await this.batches.findProgress(batchId))) throw new AppError(404, "Batch not found", "BATCH_NOT_FOUND");
    return this.items.findByBatchId(batchId, page, limit);
  }

  public async stop(id: string) {
    const batch = await this.batches.findProgress(id);
    if (!batch) throw new AppError(404, "Batch not found", "BATCH_NOT_FOUND");
    if (!["PENDING", "PROCESSING"].includes(batch.status)) return this.getBatch(id);
    await this.items.stopForBatch(id);
    await this.batches.stop(id);
    const stopped = await this.batches.findWithProgress(id);
    if (stopped) await publishProgress({ batchId: id, type: "progress", data: stopped });
    return stopped;
  }

  public async retry(jobItemId: string) {
    const item = await this.items.findById(jobItemId);
    if (!item) throw new AppError(404, "Job item not found", "JOB_ITEM_NOT_FOUND");
    if (item.status !== "FAILED") throw new AppError(409, "Only failed job items can be retried", "NOT_RETRYABLE");
    await this.items.resetForRetry(item.id);
    await this.batches.reverseFailureForRetry(item.batchId);
    await enqueueJobItem(item.id, true);
    const batch = await this.batches.findWithProgress(item.batchId);
    if (batch) await publishProgress({ batchId: item.batchId, type: "progress", data: batch });
    return item.id;
  }
}
