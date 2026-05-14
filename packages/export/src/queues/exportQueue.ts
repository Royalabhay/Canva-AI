import { Queue, QueueEvents, type JobsOptions } from "bullmq";
import { getRedisConnection } from "./connection";
import type { ExportJobData } from "../types";

export const EXPORT_QUEUE_NAME = "canva-ai:exports";

let queue: Queue<ExportJobData> | null = null;
let events: QueueEvents | null = null;

export function getExportQueue(): Queue<ExportJobData> {
  queue ??= new Queue<ExportJobData>(EXPORT_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1000 },
      removeOnFail: { age: 604_800, count: 5000 }
    }
  });
  return queue;
}

export function getExportQueueEvents(): QueueEvents {
  events ??= new QueueEvents(EXPORT_QUEUE_NAME, { connection: getRedisConnection() });
  return events;
}

export async function enqueueExport(data: ExportJobData, options: JobsOptions = {}) {
  return getExportQueue().add("render-export", data, {
    jobId: data.jobId,
    priority: data.priority ?? 5,
    ...options
  });
}
