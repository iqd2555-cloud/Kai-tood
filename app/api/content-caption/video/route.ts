import { NextResponse } from "next/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";
import { generateContentCaption } from "@/lib/ai-caption";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string; frames?: string[] } | null;
  const id = String(body?.id ?? "");
  const frames = Array.isArray(body?.frames) ? body!.frames.filter((x) => typeof x === "string" && x.startsWith("data:image/")) : [];
  if (!id || frames.length < 2 || frames.length > 4) return NextResponse.json({ error: "invalid video frames" }, { status: 400 });

  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) return NextResponse.json({ error: "KPI connection unavailable" }, { status: 500 });
  const { data, error } = await kpi
    .from("content_automation_queue")
    .select("id,source_type,source_work_date")
    .eq("id", id)
    .eq("owner_status", "approved")
    .maybeSingle();
  if (error || !data || data.source_type !== "video") return NextResponse.json({ error: "video item not found" }, { status: 404 });

  await kpi.from("content_automation_queue").update({ caption_status: "generating", updated_at: new Date().toISOString() }).eq("id", id);
  try {
    const caption = await generateContentCaption({ imageUrls: frames, sourceType: "video", workDate: data.source_work_date });
    const { error: updateError } = await kpi.from("content_automation_queue").update({
      caption_text: caption,
      caption_status: "ready",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, caption });
  } catch (e) {
    await kpi.from("content_automation_queue").update({ caption_status: "failed", updated_at: new Date().toISOString() }).eq("id", id);
    console.error("video caption generation failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "caption failed" }, { status: 500 });
  }
}
