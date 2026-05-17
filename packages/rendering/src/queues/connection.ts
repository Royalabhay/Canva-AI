import net from "node:net";
import { Redis } from "ioredis";

let connection: Redis | null = null;
let warned = false;

export async function canReachRenderingRedis(timeoutMs = 150): Promise<boolean> {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  const host = redisUrl.hostname || "127.0.0.1";
  const port = Number(redisUrl.port || 6379);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export function getRenderingRedis() {
  if (connection) return connection;
  connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
    connectTimeout: 500,
    enableOfflineQueue: false,
    retryStrategy: () => null
  });
  connection.on("error", (error) => {
    if (!warned) {
      warned = true;
      console.warn(`[rendering] Redis unavailable: ${error.message}. Start Redis to enable render queues.`);
    }
  });
  return connection;
}
