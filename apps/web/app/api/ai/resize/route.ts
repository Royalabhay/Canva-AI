import { NextResponse, type NextRequest } from "next/server";
import { resizeDesignAction } from "../../../../actions/ai";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await resizeDesignAction(payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
