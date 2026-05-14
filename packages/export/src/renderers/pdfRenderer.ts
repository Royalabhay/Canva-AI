import sharp from "sharp";
import { PDFDocument, PageSizes, rgb } from "pdf-lib";
import { createFabricRenderPage } from "./browser";
import { mimeForFormat } from "../utils/mime";
import type { DesignPage, RenderOptions, RenderedArtifact } from "../types";

const POINTS_PER_INCH = 72;

export async function renderPdf(pages: DesignPage[], options: RenderOptions): Promise<RenderedArtifact> {
  const pdf = await PDFDocument.create();
  pdf.setProducer("Canva AI Export Renderer");
  pdf.setCreator("Canva AI");

  for (const page of pages) {
    const widthPt = pixelsToPoints(options.width ?? page.width, options.printDpi);
    const heightPt = pixelsToPoints(options.height ?? page.height, options.printDpi);
    const pdfPage = pdf.addPage([widthPt, heightPt] as typeof PageSizes.A4);
    if (!options.transparentBackground) {
      const color = parseHex(page.background ?? "#ffffff");
      pdfPage.drawRectangle({ x: 0, y: 0, width: widthPt, height: heightPt, color });
    }
    const renderPage = await createFabricRenderPage(page, options.transparentBackground);
    try {
      const svg = await renderPage.evaluate(() => {
        const canvas = (window as unknown as { __CANVA_EXPORT_CANVAS__: { toSVG: () => string } }).__CANVA_EXPORT_CANVAS__;
        return canvas.toSVG();
      });
      const png = await sharp(Buffer.from(svg)).resize({ width: Math.round(options.width ?? page.width), height: Math.round(options.height ?? page.height), fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();
      const embedded = await pdf.embedPng(png);
      pdfPage.drawImage(embedded, { x: 0, y: 0, width: widthPt, height: heightPt });
    } finally {
      await renderPage.close();
    }
  }

  const bytes = await pdf.save({ useObjectStreams: true });
  const buffer = Buffer.from(bytes);
  return { buffer, format: "pdf", mimeType: mimeForFormat("pdf"), extension: "pdf", bytes: buffer.byteLength, pageCount: pages.length, metadata: { printDpi: options.printDpi, vectorSafe: true } };
}

function pixelsToPoints(pixels: number, dpi: number): number {
  return (pixels / dpi) * POINTS_PER_INCH;
}

function parseHex(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "ffffff";
  return rgb(parseInt(normalized.slice(0, 2), 16) / 255, parseInt(normalized.slice(2, 4), 16) / 255, parseInt(normalized.slice(4, 6), 16) / 255);
}
