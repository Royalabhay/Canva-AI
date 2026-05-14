import { Redis } from "ioredis";

export interface RedisConfig { url?: string; host?: string; port?: number; password?: string }

let connection: Redis | null = null;

export function getRedisConnection(config: RedisConfig = {}): Redis {
  if (connection) return connection;
  const url = config.url ?? process.env.REDIS_URL;
  connection = url ? new Redis(url, { maxRetriesPerRequest: null }) : new Redis({ host: config.host ?? process.env.REDIS_HOST ?? "127.0.0.1", port: config.port ?? Number(process.env.REDIS_PORT ?? 6379), password: config.password ?? process.env.REDIS_PASSWORD, maxRetriesPerRequest: null });
  return connection;
}
