import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

let loaded = false;

function repoRoot() {
  const current = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(current, "../../..");
}

export function loadCanvaEnv(): void {
  if (loaded || typeof window !== "undefined") return;
  loaded = true;
  const root = repoRoot();
  loadEnvConfig(root, process.env.NODE_ENV !== "production", { info: () => undefined, error: console.error });
  loadEnvConfig(path.join(root, "apps/web"), process.env.NODE_ENV !== "production", { info: () => undefined, error: console.error });
}
