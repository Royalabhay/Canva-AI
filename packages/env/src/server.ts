import { loadCanvaEnv } from "./load";
import { serverEnvSchema, type ServerEnv } from "./schema";

let cached: ServerEnv | null = null;

function formatIssues(error: unknown): string {
  if (!error || typeof error !== "object" || !("issues" in error)) return String(error);
  const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
}

function hydrateProcessEnv(env: ServerEnv): void {
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = String(value);
  }
}

export function validateServerEnv({ strict = false }: { strict?: boolean } = {}) {
  loadCanvaEnv();
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success && strict) throw new Error(`Invalid server environment variables:\n${formatIssues(parsed.error)}`);
  if (parsed.success) hydrateProcessEnv(parsed.data);
  return parsed;
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  loadCanvaEnv();
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = `Invalid server environment variables:\n${formatIssues(parsed.error)}`;
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(message);
    cached = serverEnvSchema.parse({ ...process.env, NODE_ENV: process.env.NODE_ENV ?? "development" });
    hydrateProcessEnv(cached);
    return cached;
  }
  cached = parsed.data;
  hydrateProcessEnv(cached);
  return cached;
}

export function assertServerEnv(): ServerEnv {
  validateServerEnv({ strict: true });
  return getServerEnv();
}

export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: keyof ServerEnv) {
    return getServerEnv()[prop];
  }
});
