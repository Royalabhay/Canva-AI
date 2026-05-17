import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { Worker, type Job } from "bullmq";
import { getRenderingRedis } from "../queues/connection";
import { RENDER_QUEUE_NAMES } from "../queues/renderQueues";
import { createRenderingServiceClient } from "../services/supabase";
import { heartbeat, updateRenderJob } from "../services/renderRepository";
import { processVideoRenderJob } from "../pipelines/videoPipeline";
import { processThumbnailJob, processTranscodeJob } from "../pipelines/transcodePipeline";
import type { RenderJobData, RenderKind } from "../types";

export interface RenderWorkerOptions { kind: RenderKind; concurrency?: number; pool?: string; gpuEnabled?: boolean; workerId?: string }
export function createRenderWorker(options: RenderWorkerOptions) {
  const workerId = options.workerId ?? `${options.kind}-${hostname()}-${randomUUID()}`;
  const concurrency = options.concurrency ?? Number(process.env.RENDER_WORKER_CONCURRENCY ?? 2);
  const pool = options.pool ?? `${options.kind}-cpu`;
  const db = createRenderingServiceClient();
  const beat = (status: "idle" | "busy" | "draining" | "offline") => heartbeat(db, { workerId, pool, hostname: hostname(), version: process.env.npm_package_version ?? "0.1.0", concurrency, gpuEnabled: options.gpuEnabled ?? false, status }).catch(console.error);
  void beat("idle"); const interval = setInterval(() => void beat("idle"), 15_000);
  const worker = new Worker<RenderJobData>(RENDER_QUEUE_NAMES[options.kind], async (job: Job<RenderJobData>) => {
    await beat("busy");
    if (options.kind === "video") return processVideoRenderJob(job.data, workerId, (progress, message) => job.updateProgress({ progress, message }));
    if (options.kind === "thumbnail") return processThumbnailJob(job.data, workerId);
    if (options.kind === "transcode") return processTranscodeJob(job.data, workerId);
    if (options.kind === "image") return processThumbnailJob(job.data, workerId);
    if (options.kind === "audio") throw new Error("Audio mix jobs require timeline audio sources and are routed through video pipeline");
  }, { connection: getRenderingRedis(), concurrency, lockDuration: 180_000, stalledInterval: 30_000, maxStalledCount: 2 });
  worker.on("completed", () => void beat("idle"));
  worker.on("failed", async (job, error) => { if (job) await updateRenderJob(db, job.data.renderJobId, { status: job.attemptsMade >= (job.opts.attempts ?? 3) ? "dead_letter" : "failed", error: error.message }).catch(console.error); void beat("idle"); });
  worker.on("closing", () => { clearInterval(interval); void beat("draining"); });
  return { worker, workerId, close: async () => { clearInterval(interval); await beat("offline"); await worker.close(); } };
}
