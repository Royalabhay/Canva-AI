import { NextResponse, type NextRequest } from "next/server";
import { requestRender } from "@canva-ai/rendering/api";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { const db = await createSupabaseServerClient(); const { data: { user }, error } = await db.auth.getUser(); if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 }); try { const ids = await requestRender(await request.json(), user.id); return NextResponse.json(ids, { status: 202 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to queue render" }, { status: 400 }); } }
