import { createRenderWorker } from "@canva-ai/rendering/server";
const runtime = createRenderWorker({ kind: "image", pool: process.env.RENDER_WORKER_POOL ?? "image-cpu" });
process.on("SIGTERM", () => void runtime.close().then(() => process.exit(0)));
process.on("SIGINT", () => void runtime.close().then(() => process.exit(0)));
