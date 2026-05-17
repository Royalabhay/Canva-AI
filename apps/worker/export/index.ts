import { createExportWorker, registerExportWorkerEvents } from "@canva-ai/export/server";

const worker = createExportWorker();
registerExportWorkerEvents(worker);

process.on("SIGTERM", () => void worker.close().then(() => process.exit(0)));
process.on("SIGINT", () => void worker.close().then(() => process.exit(0)));
