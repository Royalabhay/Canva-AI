import { z } from "zod";

const localSupabaseUrl = "http://127.0.0.1:54321";
const localDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const devAnonKey = "dev-local-anon-key";
const devServiceKey = "dev-local-service-role-key";

function requiredInProduction(name: string, fallback: string) {
  return z.string().min(1).optional().transform((value, context) => {
    if (value && value.trim().length > 0) return value;
    if (process.env.NODE_ENV === "production" && process.env.CANVA_ENV_STRICT === "true") {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${name} is required in production` });
      return z.NEVER;
    }
    return fallback;
  });
}

const urlWithDevFallback = (name: string, fallback: string) => requiredInProduction(name, fallback).pipe(z.string().url());
const numberFromEnv = (fallback: number) => z.coerce.number().int().positive().catch(fallback);

export const clientEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: urlWithDevFallback("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_SITE_URL: urlWithDevFallback("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: urlWithDevFallback("NEXT_PUBLIC_SUPABASE_URL", localSupabaseUrl),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredInProduction("NEXT_PUBLIC_SUPABASE_ANON_KEY", devAnonKey),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: requiredInProduction("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_local")
});

export const serverEnvSchema = clientEnvSchema.extend({
  DATABASE_URL: requiredInProduction("DATABASE_URL", localDatabaseUrl),
  DIRECT_URL: requiredInProduction("DIRECT_URL", localDatabaseUrl),
  SUPABASE_SERVICE_ROLE_KEY: requiredInProduction("SUPABASE_SERVICE_ROLE_KEY", devServiceKey),
  AUTH_REDIRECT_URL: urlWithDevFallback("AUTH_REDIRECT_URL", "http://localhost:3000/auth/callback"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  SUPABASE_STORAGE_BUCKET_UPLOADS: z.string().min(1).default("uploads"),
  SUPABASE_STORAGE_BUCKET_EXPORTS: z.string().min(1).default("exports"),
  SUPABASE_STORAGE_BUCKET_THUMBNAILS: z.string().min(1).default("thumbnails"),
  SUPABASE_STORAGE_BUCKET_RENDER_TEMP: z.string().min(1).default("render-temp"),
  SUPABASE_STORAGE_BUCKET_TEMPLATES: z.string().min(1).default("templates"),
  SUPABASE_STORAGE_BUCKET_BRAND_ASSETS: z.string().min(1).default("brand-assets"),
  SIGNED_UPLOAD_URL_TTL_SECONDS: numberFromEnv(600),
  SIGNED_DOWNLOAD_URL_TTL_SECONDS: numberFromEnv(3600),
  MAX_UPLOAD_BYTES: numberFromEnv(52_428_800),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.5"),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  REPLICATE_API_TOKEN: z.string().optional().default(""),
  RENDERING_SERVICE_URL: urlWithDevFallback("RENDERING_SERVICE_URL", "http://localhost:3001"),
  RENDERING_SERVICE_TOKEN: requiredInProduction("RENDERING_SERVICE_TOKEN", "dev-render-token"),
  EXPORT_WEBHOOK_SECRET: requiredInProduction("EXPORT_WEBHOOK_SECRET", "dev-export-secret"),
  CANVAS_RENDER_TIMEOUT_MS: numberFromEnv(30_000),
  REDIS_URL: z.string().optional().default("redis://127.0.0.1:6379"),
  EXPORT_WORKER_CONCURRENCY: numberFromEnv(2),
  EXPORT_RATE_LIMIT_PER_MINUTE: numberFromEnv(30),
  STRIPE_SECRET_KEY: requiredInProduction("STRIPE_SECRET_KEY", "sk_test_local"),
  STRIPE_WEBHOOK_SECRET: requiredInProduction("STRIPE_WEBHOOK_SECRET", "whsec_local"),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional().default(""),
  STRIPE_PRO_ANNUAL_PRICE_ID: z.string().optional().default(""),
  STRIPE_TEAM_MONTHLY_PRICE_ID: z.string().optional().default(""),
  STRIPE_TEAM_ANNUAL_PRICE_ID: z.string().optional().default("")
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
