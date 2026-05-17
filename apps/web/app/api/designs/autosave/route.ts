import { NextResponse, type NextRequest } from "next/server";
import { autosaveDesignAction } from "../../../../actions/projects";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const result = await autosaveDesignAction(payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
