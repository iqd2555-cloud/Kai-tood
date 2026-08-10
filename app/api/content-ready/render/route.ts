import { NextResponse } from "next/server";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  // สิทธิ์เจ้าของตรวจจากระบบ Auth หลักของเว็บก่อน
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) return NextResponse.json({ error: "KPI Supabase is not configured" }, { status: 500 });

  const form = await request.formData();
  const queueId = String(form.get("queue_id") ?? "").trim();
  const file = form.get("file");
  if (!queueId || !(file instanceof File) || file.type !== "image/jpeg" || file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
  }

  // Auth profile และ KPI profile เป็นคนละฐานและใช้ UUID คนละชุด จึงห้ามเทียบ profile.id กันตรง ๆ
  const { data: queue, error: queueError } = await kpi
    .from("content_automation_queue")
    .select("id,organization_id,source_type,owner_status,caption_text,quote_text")
    .eq("id", queueId)
    .maybeSingle();

  if (queueError || !queue) return NextResponse.json({ error: "Content item not found" }, { status: 404 });

  // ยืนยันว่าองค์กรของรายการยังมี Owner ที่ active ในฐาน KPI
  const { data: ownerProfile, error: ownerError } = await kpi
    .from("profiles")
    .select("id,organization_id,role,status")
    .eq("organization_id", queue.organization_id)
    .eq("role", "owner")
    .neq("status", "inactive")
    .limit(1)
    .maybeSingle();

  if (ownerError || !ownerProfile) {
    return NextResponse.json({ error: "Active owner profile not found for content organization" }, { status: 403 });
  }

  if (queue.owner_status !== "approved" || queue.source_type !== "image" || !queue.caption_text || !queue.quote_text) {
    return NextResponse.json({ error: "Content is not ready to render" }, { status: 409 });
  }

  const path = `${queue.organization_id}/${queue.id}/post-ready.jpg`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await kpi.storage.from("content-ready").upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: updateError } = await kpi
    .from("content_automation_queue")
    .update({
      rendered_bucket: "content-ready",
      rendered_path: path,
      visual_status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", queueId)
    .eq("organization_id", queue.organization_id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ ok: true, bucket: "content-ready", path });
}
