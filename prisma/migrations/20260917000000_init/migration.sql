-- CreateEnum
CREATE TYPE "BatchMode" AS ENUM ('SIMULATION', 'URL_HEALTH');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "mode" "BatchMode" NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "url" TEXT,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");
CREATE INDEX "JobItem_batchId_idx" ON "JobItem"("batchId");
CREATE INDEX "JobItem_status_idx" ON "JobItem"("status");
CREATE INDEX "JobItem_batchId_status_idx" ON "JobItem"("batchId", "status");

-- AddForeignKey
ALTER TABLE "JobItem" ADD CONSTRAINT "JobItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
