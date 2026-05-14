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
  const ids = await createExportRecords(client, request);
  const data: ExportJobData = { ...request, ...ids };
  await enqueueExport(data, { priority: request.options.format === "pdf" ? 4 : 5 });
  return ids;
}
