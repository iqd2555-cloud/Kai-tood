import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";
import { generateContentCaption } from "@/lib/ai-caption";

type MediaRow = { storage_bucket: string | null; storage_path: string | null };
type CaptionRow = {
  source_type: string | null;
  source_work_date: string | null;
  work_submission_media: MediaRow | MediaRow[] | null;
};
type Row = CaptionRow & {
  id: string;
  caption_status: string;
  caption_text: string | null;
  publish_status: string;
};

async function buildCaption(
  kpi: NonNullable<ReturnType<typeof createKpiSupabaseAdminClient>>,
  row: CaptionRow,
) {
  const raw = row.work_submission_media;
  const media = Array.isArray(raw) ? raw[0] ?? null : raw;
  let url: string | null = null;
  if (media?.storage_path && row.source_type !== "video") {
    const { data: signed } = await kpi.storage
      .from(media.storage_bucket ?? "employee-footage")
      .createSignedUrl(media.storage_path, 600);
    url = signed?.signedUrl ?? null;
  }
  return generateContentCaption({
    imageUrl: url,
    sourceType: row.source_type,
    workDate: row.source_work_date,
  });
}

async function generateAll() {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) redirect("/content-ready?bulk=failed");

  const { data, error } = await kpi
    .from("content_automation_queue")
    .select("id,source_type,source_work_date,caption_status,caption_text,work_submission_media(storage_bucket,storage_path)")
    .eq("owner_status", "approved")
    .in("publish_status", ["not_connected", "pending"])
    .or("caption_text.is.null,caption_status.neq.ready")
    .order("owner_reviewed_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("bulk caption load failed", error);
    redirect("/content-ready?bulk=failed");
  }

  let ok = 0;
  let failed = 0;
  for (const row of (data ?? []) as Row[]) {
    try {
      await kpi.from("content_automation_queue").update({
        caption_status: "generating",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      const caption = await buildCaption(kpi, row);
      const { error: updateError } = await kpi.from("content_automation_queue").update({
        caption_text: caption,
        caption_status: "ready",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      if (updateError) throw updateError;
      ok++;
    } catch (error) {
      failed++;
      console.error("bulk caption generation failed", { id: row.id, error });
      await kpi.from("content_automation_queue").update({
        caption_status: "failed",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
    }
  }
  revalidatePath("/content-ready");
  redirect(`/content-ready?bulk=done&ok=${ok}&failed=${failed}`);
}

async function regenerate(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id) redirect("/content-ready?ai=failed");
  try {
    const { data, error } = await kpi
      .from("content_automation_queue")
      .select("source_type,source_work_date,work_submission_media(storage_bucket,storage_path)")
      .eq("id", id)
      .eq("owner_status", "approved")
      .maybeSingle();
    if (error || !data) throw error ?? new Error("ไม่พบรายการ");
    const row = data as CaptionRow;
    const caption = await buildCaption(kpi, row);
    const { error: updateError } = await kpi.from("content_automation_queue").update({
      caption_text: caption,
      caption_status: "ready",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (updateError) throw updateError;
    revalidatePath("/content-ready");
    redirect("/content-ready?ai=success");
  } catch (error) {
    console.error("regenerate caption failed", error);
    redirect("/content-ready?ai=failed");
  }
}

async function saveCaption(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id || !caption) redirect("/content-ready?save=failed");
  const { error } = await kpi.from("content_automation_queue").update({
    caption_text: caption,
    caption_status: "ready",
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_status", "approved");
  if (error) {
    console.error("save caption failed", error);
    redirect("/content-ready?save=failed");
  }
  revalidatePath("/content-ready");
  redirect("/content-ready?save=success");
}

async function setDecision(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id) redirect("/content-ready?decision=failed");
  const publishStatus = decision === "approve" ? "approved" : "rejected";
  const { error } = await kpi.from("content_automation_queue").update({
    publish_status: publishStatus,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_status", "approved");
  if (error) {
    console.error("content decision failed", error);
    redirect("/content-ready?decision=failed");
  }
  revalidatePath("/content-ready");
  redirect(`/content-ready?decision=${decision}`);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) return <main className="p-4">ไม่พบการเชื่อมต่อ KPI</main>;

  const p = searchParams ? await searchParams : {};
  const ai = typeof p.ai === "string" ? p.ai : "";
  const save = typeof p.save === "string" ? p.save : "";
  const decision = typeof p.decision === "string" ? p.decision : "";
  const bulk = typeof p.bulk === "string" ? p.bulk : "";
  const ok = typeof p.ok === "string" ? p.ok : "0";
  const failed = typeof p.failed === "string" ? p.failed : "0";

  const { data, error } = await kpi
    .from("content_automation_queue")
    .select("id,source_type,source_work_date,caption_status,caption_text,publish_status,work_submission_media(storage_bucket,storage_path)")
    .eq("owner_status", "approved")
    .in("publish_status", ["not_connected", "pending"])
    .order("owner_reviewed_at", { ascending: false })
    .limit(30);

  if (error) return <main className="p-4">โหลดไม่สำเร็จ: {error.message}</main>;
  const rows = (data ?? []) as Row[];
  const needAi = rows.filter((row) => !row.caption_text || row.caption_status !== "ready").length;
  const cards = await Promise.all(rows.map(async (row) => {
    const raw = row.work_submission_media;
    const media = Array.isArray(raw) ? raw[0] ?? null : raw;
    if (!media?.storage_path) return { ...row, url: null as string | null };
    const { data: signed } = await kpi.storage
      .from(media.storage_bucket ?? "employee-footage")
      .createSignedUrl(media.storage_path, 3600);
    return { ...row, url: signed?.signedUrl ?? null };
  }));

  return <main className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 pb-24">
    <header className="rounded-3xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-red-600">OWNER • CONTENT</p>
      <h1 className="text-2xl font-black">Content รออนุมัติโพสต์</h1>
      <p className="text-sm text-black/55">AI เขียนให้ • คุณตรวจ แก้ หรืออนุมัติก่อนโพสต์จริง</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="inline-flex rounded-2xl bg-black px-4 py-2 font-black text-white">{cards.length} รายการ</div>
        {needAi > 0 ? <div className="text-sm font-bold text-amber-700">รอ AI {needAi}</div> : <div className="text-sm font-bold text-green-700">AI พร้อมทั้งหมด</div>}
      </div>
      {needAi > 0 ? <form action={generateAll} className="mt-3"><button className="w-full rounded-2xl bg-red-600 px-4 py-3 font-black text-white">สร้างแคปชัน AI ที่เหลือทั้งหมด ({needAi})</button></form> : null}
    </header>
    {bulk === "done" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">AI สร้างสำเร็จ {ok} รายการ{failed !== "0" ? ` • ไม่สำเร็จ ${failed} รายการ` : ""}</div> : null}
    {bulk === "failed" ? <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-800">เริ่มสร้างแคปชันทั้งหมดไม่สำเร็จ</div> : null}
    {ai === "success" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">AI เขียนแคปชันใหม่เรียบร้อย</div> : null}
    {ai === "failed" ? <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-800">AI สร้างแคปชันไม่สำเร็จ กรุณาลองอีกครั้ง</div> : null}
    {save === "success" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">บันทึกแคปชันเรียบร้อย</div> : null}
    {decision === "approve" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">อนุมัติแล้ว • พร้อมเข้าสู่ขั้นตอนโพสต์</div> : null}
    {decision === "reject" ? <div className="rounded-2xl bg-neutral-100 p-3 font-bold">ตัดรายการออกจากคิวโพสต์แล้ว</div> : null}
    {cards.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-center font-bold text-black/50">ไม่มี Content รอตรวจ</div> : null}
    {cards.map((item) => <article key={item.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="bg-black">
        {item.url ? (item.source_type === "video" ? <video src={item.url} controls playsInline className="max-h-[70vh] w-full object-contain" /> : <img src={item.url} alt="Content" className="max-h-[70vh] w-full object-contain" />) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex justify-between text-xs font-bold text-black/50"><span>{item.source_type === "video" ? "🎬 คลิป" : "📷 รูป"}</span><span>{item.caption_status === "ready" ? "AI พร้อม" : item.caption_status === "failed" ? "AI ไม่สำเร็จ" : "รอ AI"}</span></div>
        <form action={saveCaption} className="space-y-2">
          <input type="hidden" name="id" value={item.id} />
          <textarea name="caption" defaultValue={item.caption_text ?? ""} rows={6} required placeholder="แคปชัน" className="w-full rounded-2xl border border-black/10 bg-black/[.03] p-4 text-[15px] leading-7 outline-none focus:border-black" />
          <button className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-black">บันทึกข้อความที่แก้</button>
        </form>
        <form action={regenerate}><input type="hidden" name="id" value={item.id} /><button className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-black">{item.caption_text ? "ให้ AI เขียนใหม่" : "สร้างแคปชันด้วย AI"}</button></form>
        <div className="grid grid-cols-2 gap-2">
          <form action={setDecision}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="reject" /><button className="w-full rounded-2xl border border-black/15 bg-white px-3 py-3 font-black">ไม่ใช้</button></form>
          <form action={setDecision}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="approve" /><button disabled={!item.caption_text} className="w-full rounded-2xl bg-black px-3 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-black/25">✓ อนุมัติโพสต์</button></form>
        </div>
        <p className="text-center text-xs text-black/45">การอนุมัติขั้นนี้ยังไม่โพสต์ออกโซเชียลจริง</p>
      </div>
    </article>)}
  </main>;
}
