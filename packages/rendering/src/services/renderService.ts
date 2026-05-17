import { renderRequestSchema, type RenderRequest } from "../types";
import { enqueueRenderJob } from "../queues/renderQueues";
import { createRenderingServiceClient } from "./supabase";
import { assertRenderAccess, createRenderJobRecord } from "./renderRepository";

export async function requestRender(input: unknown, userId: string) {
  const payload = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const request = renderRequestSchema.parse({ ...payload, requestedBy: userId });
  const client = createRenderingServiceClient();
  await assertRenderAccess(client, request.workspaceId, userId);
  const renderJobId = await createRenderJobRecord(client, request);
  const queueJobId = `${request.kind}:${renderJobId}`;
  await enqueueRenderJob({ ...request, renderJobId, queueJobId }, { priority: request.priority });
  return { renderJobId, queueJobId };
}
export type { RenderRequest };
