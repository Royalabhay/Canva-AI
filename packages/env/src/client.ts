import { clientEnvSchema, type ClientEnv } from "./schema";

let cached: ClientEnv | null = null;

function formatIssues(error: unknown): string {
  if (!error || typeof error !== "object" || !("issues" in error)) return String(error);
  const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
  return issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
}

export function getClientEnv(): ClientEnv {
  if (cached) return cached;
  const parsed = clientEnvSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid public environment variables:\n${formatIssues(parsed.error)}`);
  cached = parsed.data;
  return cached;
}

export const clientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop: keyof ClientEnv) {
    return getClientEnv()[prop];
  }
});
