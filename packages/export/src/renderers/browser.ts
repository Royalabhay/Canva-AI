import { createRequire } from "node:module";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { DesignPage } from "../types";

const require = createRequire(import.meta.url);
const fabricBrowserBundle = require.resolve("fabric");

let browserPromise: Promise<Browser> | null = null;

export async function getRenderBrowser(): Promise<Browser> {
  browserPromise ??= puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=medium"]
  });
  return browserPromise;
}

export async function closeRenderBrowser(): Promise<void> {
  const browser = await browserPromise;
  browserPromise = null;
  await browser?.close();
}

export async function createFabricRenderPage(design: DesignPage, transparent: boolean): Promise<Page> {
  const browser = await getRenderBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: design.width, height: design.height, deviceScaleFactor: 1 });
  page.setDefaultTimeout(45_000);
  await page.setContent(renderHtml(design.width, design.height, transparent), { waitUntil: "load" });
  await page.addScriptTag({ path: fabricBrowserBundle });
  await page.evaluate(async ({ json, width, height, background, transparentBackground }) => {
    const fabricModule = (window as unknown as { fabric: typeof import("fabric") }).fabric;
    const canvas = new fabricModule.Canvas("canvas", {
      width,
      height,
      backgroundColor: transparentBackground ? undefined : background ?? (json.background as string | undefined) ?? "#ffffff",
      renderOnAddRemove: false,
      enableRetinaScaling: false
    });
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const loadPayload = { ...json, viewportTransform: [1, 0, 0, 1, 0, 0] };
    await canvas.loadFromJSON(loadPayload);
    canvas.getObjects().forEach((object) => {
      object.set({ selectable: false, evented: false });
      object.setCoords();
    });
    canvas.requestRenderAll();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    Object.assign(window, { __CANVA_EXPORT_CANVAS__: canvas });
  }, { json: design.fabricJson, width: design.width, height: design.height, background: design.background, transparentBackground: transparent });
  return page;
}

function renderHtml(width: number, height: number, transparent: boolean): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:${transparent ? "transparent" : "white"};}canvas{display:block;}</style></head><body><canvas id="canvas" width="${width}" height="${height}"></canvas></body></html>`;
}
