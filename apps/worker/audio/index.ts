import { createRenderWorker } from "@canva-ai/rendering/server";
const runtime = createRenderWorker({ kind: "audio", pool: process.env.RENDER_WORKER_POOL ?? "audio-cpu" });
process.on("SIGTERM", () => void runtime.close().then(() => process.exit(0)));
process.on("SIGINT", () => void runtime.close().then(() => process.exit(0)));
