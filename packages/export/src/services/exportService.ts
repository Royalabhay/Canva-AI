import { assertQuota, reserveQuota } from "@canva-ai/billing/server";
import { enqueueExport } from "../queues/exportQueue";
import { exportRequestSchema, type ExportJobData, type ExportRequest } from "../types";
import { assertRateLimit } from "../utils/rateLimit";
import { createExportRecords, assertWorkspaceExportAccess } from "./exportRepository";
import { createExportServiceClient } from "./supabaseStorage";

export async function requestExport(input: unknown): Promise<{ exportId: string; jobId: string }> {
  const request = exportRequestSchema.parse(input);
  assertRateLimit(`${request.workspaceId}:${request.requestedBy}`);
  const client = createExportServiceClient();
  await assertWorkspaceExportAccess(client, request.workspaceId, request.requestedBy);
  const pixelCount = (request.options.width ?? request.pages[0].width) * (request.options.height ?? request.pages[0].height) * request.options.scale;
  const isPremiumExport = ["pdf", "svg", "mp4"].includes(request.options.format) || pixelCount > 1920 * 1080 * 2 || request.options.scale > 2;
  await assertQuota(request.workspaceId, "export", 1);
  if (isPremiumExport) await assertQuota(request.workspaceId, "premium_export", 1);
  await reserveQuota(request.workspaceId, "export", 1, request.requestedBy, { format: request.options.format });
  if (isPremiumExport) await reserveQuota(request.workspaceId, "premium_export", 1, request.requestedBy, { format: request.options.format, pixelCount });
  const ids = await createExportRecords(client, request);
  const data: ExportJobData = { ...request, ...ids };
  await enqueueExport(data, { priority: request.options.format === "pdf" ? 4 : 5 });
  return ids;
}
