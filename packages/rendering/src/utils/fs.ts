import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function createRenderTempDir(prefix = "canva-render-") { return mkdtemp(join(tmpdir(), prefix)); }
export async function cleanupTempDir(path: string) { await rm(path, { recursive: true, force: true }); }
