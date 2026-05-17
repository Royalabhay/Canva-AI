import { NextResponse, type NextRequest } from "next/server";
import { enhanceDesign, fabricDesignSchema } from "@canva-ai/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const source = fabricDesignSchema.parse(await request.json());
  return NextResponse.json({ ok: true, data: enhanceDesign(source) });
}
