import { Redis } from "ioredis";
let connection: Redis | null = null;
export function getRenderingRedis() { connection ??= new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", { maxRetriesPerRequest: null }); return connection; }
