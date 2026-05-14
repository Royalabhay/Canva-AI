import type { AssetSearchInput } from "../services/assetService";

export function normalizeAssetSearch(input: AssetSearchInput): AssetSearchInput {
  return {
    ...input,
    query: input.query?.trim() ?? "",
    kind: input.kind ?? "all",
    tags: [...new Set(input.tags ?? [])],
    limit: Math.min(Math.max(input.limit ?? 40, 1), 100)
  };
}

export function createAssetSearchKey(input: AssetSearchInput) {
  const normalized = normalizeAssetSearch(input);
  return ["assets", normalized.workspaceId, normalized.kind, normalized.folderId ?? "root", normalized.query, normalized.tags?.join(",") ?? "", normalized.cursor ?? ""] as const;
}
