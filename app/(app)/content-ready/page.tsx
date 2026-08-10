import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";
import { generateContentDraft } from "@/lib/ai-content-draft";
import { ImageQuotePreview } from "./image-quote-preview";

type MediaRow = { storage_bucket: string | null; storage_path: string | null };
type DraftRow = {
  id: string;
  source_type: string | null;
  source_work_date: string | null;
  caption_status: string;
  caption_text: string | null;
  quote_text: string | null;
  visual_status: string | null;
  rendered_bucket: string | null;
  rendered_path: string | null;
  publish_status: string;
  work_submission_media: MediaRow | MediaRow[] | null;
};

async function buildDraft(kpi: NonNullable<ReturnType<typeof createKpiSupabaseAdminClient>>, row: DraftRow) {
  const raw = row.work_submission_media;
  const media = Array.isArray(raw) ? raw[0] ?? null : raw;
  let url: string | null = null;
  if (media?.storage_path && row.source_type !== "video") {
    const { data: signed } = await kpi.storage.from(media.storage_bucket ?? "employee-footage").createSignedUrl(media.storage_path, 600);
    url = signed?.signedUrl ?? null;
  }
  return generateContentDraft({ imageUrl: url, sourceType: row.source_type, workDate: row.source_work_date });
}

async function generateOne(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "").trim();
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id) redirect("/content-ready?ai=failed");
  try {
    const { data, error } = await kpi.from("content_automation_queue")
      .select("id,source_type,source_work_date,caption_status,caption_text,quote_text,visual_status,rendered_bucket,rendered_path,publish_status,work_submission_media(storage_bucket,storage_path)")
      .eq("id", id).eq("owner_status", "approved").maybeSingle();
    if (error || !data) throw error ?? new Error("ไม่พบรายการ");
    await kpi.from("content_automation_queue").update({ caption_status: "generating", ai_error: null, updated_at: new Date().toISOString() }).eq("id", id);
    const draft = await buildDraft(kpi, data as DraftRow);
    const { error: updateError } = await kpi.from("content_automation_queue").update({
      caption_text: draft.caption,
      quote_text: draft.quote,
      caption_status: "ready",
      visual_status: "ready_to_render",
      ai_model: "gpt-5-mini",
      ai_generated_at: new Date().toISOString(),
      ai_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (updateError) throw updateError;
    revalidatePath("/content-ready");
    redirect("/content-ready?ai=success");
  } catch (error) {
    console.error("generate content draft failed", error);
    await kpi.from("content_automation_queue").update({ caption_status: "failed", ai_error: error instanceof Error ? error.message : "unknown_error", updated_at: new Date().toISOString() }).eq("id", id);
    redirect("/content-ready?ai=failed");
  }
}

async function saveDraft(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const quote = String(formData.get("quote") ?? "").trim();
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id || !caption || !quote) redirect("/content-ready?save=failed");
  if (quote.split(/\s+/).filter(Boolean).length > 15) redirect("/content-ready?save=quote-long");
  const { error } = await kpi.from("content_automation_queue").update({
    caption_text: caption,
    quote_text: quote,
    caption_status: "ready",
    visual_status: "ready_to_render",
    owner_caption_edited: true,
    owner_quote_edited: true,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("owner_status", "approved");
  if (error) redirect("/content-ready?save=failed");
  revalidatePath("/content-ready");
  redirect("/content-ready?save=success");
}

async function setDecision(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi || !id || !["approve", "reject"].includes(decision)) redirect("/content-ready?decision=failed");
  const { data: row } = await kpi.from("content_automation_queue").select("caption_text,quote_text,source_type,visual_status,rendered_path").eq("id", id).eq("owner_status", "approved").maybeSingle();
  if (!row) redirect("/content-ready?decision=failed");
  if (decision === "approve" && (!row.caption_text || (row.source_type === "image" && (!row.quote_text || row.visual_status !== "ready" || !row.rendered_path)))) {
    redirect("/content-ready?decision=incomplete");
  }
  const { error } = await kpi.from("content_automation_queue").update({ publish_status: decision === "approve" ? "approved" : "rejected", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect("/content-ready?decision=failed");
  revalidatePath("/content-ready");
  redirect(`/content-ready?decision=${decision}`);
}

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) return <main className="p-4">ไม่พบการเชื่อมต่อ KPI</main>;
  const p = searchParams ? await searchParams : {};
  const ai = typeof p.ai === "string" ? p.ai : "";
  const save = typeof p.save === "string" ? p.save : "";
  const decision = typeof p.decision === "string" ? p.decision : "";

  const { data, error } = await kpi.from("content_automation_queue")
    .select("id,source_type,source_work_date,caption_status,caption_text,quote_text,visual_status,rendered_bucket,rendered_path,publish_status,work_submission_media(storage_bucket,storage_path)")
    .eq("owner_status", "approved").in("publish_status", ["not_connected", "pending"]).order("owner_reviewed_at", { ascending: false }).limit(30);
  if (error) return <main className="p-4">โหลดไม่สำเร็จ: {error.message}</main>;

  const rows = (data ?? []) as DraftRow[];
  const cards = await Promise.all(rows.map(async (row) => {
    const raw = row.work_submission_media;
    const media = Array.isArray(raw) ? raw[0] ?? null : raw;
    let url: string | null = null;
    let renderedUrl: string | null = null;
    if (media?.storage_path) {
      const { data: signed } = await kpi.storage.from(media.storage_bucket ?? "employee-footage").createSignedUrl(media.storage_path, 3600);
      url = signed?.signedUrl ?? null;
    }
    if (row.visual_status === "ready" && row.rendered_path) {
      const { data: rendered } = await kpi.storage.from(row.rendered_bucket ?? "content-ready").createSignedUrl(row.rendered_path, 3600);
      renderedUrl = rendered?.signedUrl ?? null;
    }
    return { ...row, url, renderedUrl };
  }));

  return <main className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 pb-24">
    <header className="rounded-3xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-red-600">OWNER • AI CONTENT REVIEW</p>
      <h1 className="text-2xl font-black">เตรียม Content ก่อนโพสต์</h1>
      <p className="text-sm text-black/55">รูปจริง + บทความ + คำคม • คุณเป็นผู้อนุมัติสุดท้าย</p>
      <div className="mt-3 inline-flex rounded-2xl bg-black px-4 py-2 font-black text-white">{cards.length} รายการ</div>
    </header>

    {ai === "success" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">AI สร้างบทความและคำคมเรียบร้อย</div> : null}
    {ai === "failed" ? <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-800">AI สร้างคอนเทนต์ไม่สำเร็จ • ยังไม่มีการโพสต์</div> : null}
    {save === "success" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">บันทึกข้อความที่แก้แล้ว • ต้องสร้างไฟล์รูปใหม่ก่อนอนุมัติ</div> : null}
    {save === "quote-long" ? <div className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-800">คำคมยาวเกิน 15 คำ กรุณาย่อก่อนบันทึก</div> : null}
    {decision === "approve" ? <div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">อนุมัติแล้ว • เข้าคิวรอระบบโพสต์</div> : null}
    {decision === "reject" ? <div className="rounded-2xl bg-neutral-100 p-3 font-bold">ตัดรายการออกจากคิวโพสต์แล้ว</div> : null}
    {decision === "incomplete" ? <div className="rounded-2xl bg-amber-50 p-3 font-bold text-amber-800">ยังอนุมัติไม่ได้ • รูปต้องสร้างเป็นไฟล์พร้อมโพสต์ก่อน</div> : null}

    {cards.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-center font-bold text-black/50">ไม่มี Content รอตรวจ</div> : null}
    {cards.map((item) => {
      const imageReady = item.source_type !== "image" || (item.visual_status === "ready" && Boolean(item.renderedUrl));
      return <article key={item.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="bg-black">{item.url ? item.source_type === "video" ? <video src={item.url} controls playsInline className="max-h-[70vh] w-full object-contain" /> : <img src={item.url} alt="Content ต้นฉบับ" className="max-h-[70vh] w-full object-contain" /> : null}</div>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-black/50"><span>{item.source_type === "video" ? "🎬 คลิป" : "📷 รูป"}</span><span>{item.caption_status === "ready" ? "AI พร้อม" : item.caption_status === "failed" ? "AI ไม่สำเร็จ" : "รอ AI"}</span></div>
          {item.source_type === "image" && item.url && item.quote_text ? <ImageQuotePreview queueId={item.id} imageUrl={item.renderedUrl || item.url} quote={item.quote_text} rendered={Boolean(item.renderedUrl)} /> : null}

          <form action={saveDraft} className="space-y-3">
            <input type="hidden" name="id" value={item.id} />
            <label className="block text-sm font-black">บทความ / Caption</label>
            <textarea name="caption" defaultValue={item.caption_text ?? ""} rows={6} required placeholder="ให้ AI สร้างหรือพิมพ์ข้อความ" className="w-full rounded-2xl border border-black/10 bg-black/[.03] p-4 text-[15px] leading-7 outline-none focus:border-black" />
            {item.source_type === "image" ? <><label className="block text-sm font-black">คำคมบนรูป <span className="font-normal text-black/45">ไม่เกิน 15 คำ</span></label><textarea name="quote" defaultValue={item.quote_text ?? ""} rows={2} required placeholder="คำคมสั้นที่สัมพันธ์กับภาพจริง" className="w-full rounded-2xl border border-black/10 bg-black/[.03] p-4 text-[15px] outline-none focus:border-black" /></> : <input type="hidden" name="quote" value={item.quote_text ?? "วิดีโอจากการทำงานจริง"} />}
            <button className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-black">บันทึกข้อความที่แก้</button>
          </form>

          <form action={generateOne}><input type="hidden" name="id" value={item.id} /><button className="w-full rounded-2xl bg-red-600 px-4 py-3 font-black text-white">{item.caption_text ? "ให้ AI เขียนบทความ + คำคมใหม่" : "สร้างบทความ + คำคมด้วย AI"}</button></form>

          <div className="grid grid-cols-2 gap-2">
            <form action={setDecision}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="reject" /><button className="w-full rounded-2xl border border-black/15 bg-white px-3 py-3 font-black">ไม่ใช้</button></form>
            <form action={setDecision}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="decision" value="approve" /><button disabled={!item.caption_text || (item.source_type === "image" && (!item.quote_text || !imageReady))} className="w-full rounded-2xl bg-black px-3 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-black/25">✓ อนุมัติเตรียมโพสต์</button></form>
          </div>
          <p className="text-center text-xs text-black/45">ขั้นนี้ยังไม่โพสต์ Facebook/Instagram จริง</p>
        </div>
      </article>;
    })}
  </main>;
}
