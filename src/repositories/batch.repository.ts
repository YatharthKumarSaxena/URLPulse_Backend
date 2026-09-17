import { type Batch, type BatchMode, type WorkStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type BatchProgress = Batch & { processing: number; pending: number };
export type BatchHistory = { batches: BatchProgress[]; stats: { totalBatches: number; completedBatches: number; failedBatches: number; activeBatches: number; totalItems: number; completedItems: number; failedItems: number; totalUrls: number } };

export class BatchRepository {
  public create(mode: BatchMode, total: number): Promise<Batch> {
    return prisma.batch.create({ data: { mode, total } });
  }

  public findById(id: string): Promise<(Batch & { items: { status: WorkStatus }[] }) | null> {
    return prisma.batch.findUnique({ where: { id }, include: { items: { select: { status: true } } } });
  }

  public findProgress(id: string): Promise<Batch | null> {
    return prisma.batch.findUnique({ where: { id } });
  }

  public async findHistory(page = 1, limit = 10): Promise<BatchHistory> {
    const [batches, totalBatches, completedBatches, failedBatches, activeBatches, itemTotals, totalUrls] = await Promise.all([
      prisma.batch.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { items: { select: { status: true } } } }),
      prisma.batch.count(),
      prisma.batch.count({ where: { status: "COMPLETED" } }),
      prisma.batch.count({ where: { status: "FAILED" } }),
      prisma.batch.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
      prisma.jobItem.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.jobItem.count({ where: { batch: { mode: "URL_HEALTH" } } }),
    ]);
    const history = batches.map(({ items, ...batch }) => ({
      ...batch,
      processing: items.filter((item) => item.status === "PROCESSING").length,
      pending: items.filter((item) => item.status === "PENDING").length,
    }));
    const countFor = (status: WorkStatus) => itemTotals.find((entry) => entry.status === status)?._count._all ?? 0;
    return { batches: history, stats: { totalBatches, completedBatches, failedBatches, activeBatches, totalItems: itemTotals.reduce((sum, entry) => sum + entry._count._all, 0), completedItems: countFor("COMPLETED"), failedItems: countFor("FAILED"), totalUrls } };
  }

  public async findWithProgress(id: string): Promise<BatchProgress | null> {
    const batch = await this.findById(id);
    if (!batch) return null;
    const { items, ...data } = batch;
    const processing = items.filter((item) => item.status === "PROCESSING").length;
    const pending = items.filter((item) => item.status === "PENDING").length;
    return { ...data, processing, pending };
  }

  public async markProcessing(id: string): Promise<Batch | null> {
    const result = await prisma.batch.updateMany({ where: { id, status: "PENDING" }, data: { status: "PROCESSING" } });
    return result.count === 0 ? null : this.findProgress(id);
  }

  public stop(id: string): Promise<Batch> {
    return prisma.batch.update({ where: { id }, data: { status: "STOPPED" } });
  }

  public async incrementFinalized(batchId: string, outcome: "COMPLETED" | "FAILED"): Promise<Batch> {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.batch.update({ where: { id: batchId }, data: outcome === "COMPLETED" ? { completed: { increment: 1 } } : { failed: { increment: 1 } } });
      const finalized = batch.completed + batch.failed;
      return finalized === batch.total
        ? tx.batch.update({ where: { id: batchId }, data: { status: batch.failed > 0 ? (batch.completed > 0 ? "PARTIAL_COMPLETED" : "FAILED") : "COMPLETED" } })
        : tx.batch.update({ where: { id: batchId }, data: { status: "PROCESSING" } });
    });
  }

  public async reverseFailureForRetry(batchId: string): Promise<Batch> {
    return prisma.batch.update({ where: { id: batchId }, data: { failed: { decrement: 1 }, status: "PROCESSING" } });
  }
}
