import { type BatchMode, type JobItem, type WorkStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export class JobItemRepository {
  public createMany(batchId: string, urls: readonly string[]): Promise<{ count: number }> {
    return prisma.jobItem.createMany({ data: urls.map((url) => ({ batchId, url: url || null })) });
  }

  public findById(id: string): Promise<(JobItem & { batch: { mode: BatchMode; status: WorkStatus } }) | null> {
    return prisma.jobItem.findUnique({ where: { id }, include: { batch: { select: { mode: true, status: true } } } });
  }

  public findByBatchId(batchId: string, page: number, limit: number): Promise<{ items: JobItem[]; total: number }> {
    return Promise.all([
      prisma.jobItem.findMany({ where: { batchId }, orderBy: { createdAt: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.jobItem.count({ where: { batchId } }),
    ]).then(([items, total]) => ({ items, total }));
  }

  public async markProcessing(id: string): Promise<JobItem | null> {
    const result = await prisma.jobItem.updateMany({ where: { id, status: "PENDING" }, data: { status: "PROCESSING", startedAt: new Date(), completedAt: null, errorMessage: null, httpStatusCode: null, responseTimeMs: null } });
    return result.count === 0 ? null : prisma.jobItem.findUnique({ where: { id } });
  }

  public markFinished(id: string, status: "COMPLETED" | "FAILED", result: { httpStatusCode?: number; responseTimeMs?: number; errorMessage?: string }): Promise<JobItem> {
    return prisma.jobItem.update({ where: { id }, data: { status, completedAt: new Date(), httpStatusCode: result.httpStatusCode ?? null, responseTimeMs: result.responseTimeMs ?? null, errorMessage: result.errorMessage ?? null } });
  }

  public resetForRetry(id: string): Promise<JobItem> {
    return prisma.jobItem.update({ where: { id }, data: { status: "PENDING", httpStatusCode: null, responseTimeMs: null, errorMessage: null, startedAt: null, completedAt: null } });
  }

  public stopForBatch(batchId: string): Promise<{ count: number }> {
    return prisma.jobItem.updateMany({ where: { batchId, status: { in: ["PENDING", "PROCESSING"] } }, data: { status: "STOPPED", completedAt: new Date(), errorMessage: "Stopped by user" } });
  }
}
