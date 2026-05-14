import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production");
loadEnvConfig(path.join(repoRoot, "apps/web"), process.env.NODE_ENV !== "production");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@canva-ai/editor", "@canva-ai/database", "@canva-ai/env", "@canva-ai/templates", "@canva-ai/assets", "@canva-ai/ai"],
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  }
};

export default nextConfig;
