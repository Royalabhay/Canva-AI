import { Worker, type Job } from "bullmq";
import { getRedisConnection } from "../queues/connection";
import { EXPORT_QUEUE_NAME } from "../queues/exportQueue";
import { processExportJob } from "../services/renderPipeline";
import { createExportServiceClient } from "../services/supabaseStorage";
import { updateExportProgress } from "../services/exportRepository";
import type { ExportJobData } from "../types";

export function createExportWorker(concurrency = Number(process.env.EXPORT_WORKER_CONCURRENCY ?? 2)): Worker<ExportJobData> {
  return new Worker<ExportJobData>(EXPORT_QUEUE_NAME, async (job: Job<ExportJobData>) => {
    return processExportJob(job.data, (progress, message) => job.updateProgress({ progress, message }));
  }, { connection: getRedisConnection(), concurrency, autorun: true, lockDuration: 120_000, stalledInterval: 30_000, maxStalledCount: 2 });
}

export function registerExportWorkerEvents(worker: Worker<ExportJobData>): void {
  worker.on("failed", async (job, error) => {
    if (!job) return;
    const client = createExportServiceClient();
    await updateExportProgress(client, job.data.exportId, job.data.jobId, "failed", Number(job.progress) || 0, error.message).catch(console.error);
  });
  worker.on("completed", (job) => {
    console.info(`Export job ${job.id} completed`);
  });
}
