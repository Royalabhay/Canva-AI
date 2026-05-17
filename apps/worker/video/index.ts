import { createRenderWorker } from "@canva-ai/rendering/server";
const runtime = createRenderWorker({ kind: "video", pool: process.env.RENDER_WORKER_POOL ?? "video-cpu", gpuEnabled: process.env.GPU_ENABLED === "true" });
process.on("SIGTERM", () => void runtime.close().then(() => process.exit(0)));
process.on("SIGINT", () => void runtime.close().then(() => process.exit(0)));
