import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import { getRenderingRedis } from "./connection";
import type { RenderJobData, RenderKind } from "../types";
export const RENDER_QUEUE_NAMES: Record<RenderKind, string> = { video: "canva:render:video", image: "canva:render:image", audio: "canva:render:audio", thumbnail: "canva:render:thumbnail", transcode: "canva:render:transcode" };
const queues = new Map<string, Queue<RenderJobData>>();
export function getRenderQueue(kind: RenderKind) { const name = RENDER_QUEUE_NAMES[kind]; let q = queues.get(name); if (!q) { q = new Queue<RenderJobData>(name, { connection: getRenderingRedis(), defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: { age: 86_400, count: 1000 }, removeOnFail: { age: 604_800, count: 5000 } } }); queues.set(name, q); } return q; }
export function getRenderQueueEvents(kind: RenderKind) { return new QueueEvents(RENDER_QUEUE_NAMES[kind], { connection: getRenderingRedis() }); }
export async function enqueueRenderJob(data: RenderJobData, options: JobsOptions = {}) { return getRenderQueue(data.kind).add(`render-${data.kind}`, data, { jobId: data.queueJobId, priority: data.priority, ...options }); }
export async function getQueueMetrics(kind: RenderKind) { const q = getRenderQueue(kind); const counts = await q.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"); return { kind, name: RENDER_QUEUE_NAMES[kind], counts }; }
