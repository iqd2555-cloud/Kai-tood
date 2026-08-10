import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";
import { generateContentCaption } from "@/lib/ai-caption";
import { ReviewButtons } from "./review-buttons";

type MediaRow = {
  id?: string | null;
  submission_id?: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  content_type: string | null;
  duplicate_status?: string | null;
  duplicate_similarity?: number | string | null;
  duplicate_of_media_id?: string | null;
};
type QueueRow = { id: string; media_id: string | null; source_type: string | null; aspect_ratio: string | null; source_work_date: string | null; created_at: string; work_submission_media: MediaRow | MediaRow[] | null };
type ContentCard = QueueRow & { media: MediaRow | null; url: string | null; suspectDuplicate: boolean; originalUrl: string | null; similarity: number | null };

async function reviewSuspectedDuplicate(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const mediaId = String(formData.get("media_id") ?? "").trim();
  const decision = String(formData.get("duplicate_decision") ?? "").trim();
  if (!mediaId || !["duplicate", "unique"].includes(decision)) redirect("/content-pool?duplicate=invalid");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) redirect("/content-pool?duplicate=config");

  const { data: media, error: mediaError } = await kpi.from("work_submission_media")
    .select("id,submission_id,duplicate_similarity,duplicate_of_media_id")
    .eq("id", mediaId).maybeSingle();
  if (mediaError || !media) redirect("/content-pool?duplicate=failed");

  if (decision === "duplicate") {
    const { error } = await kpi.from("work_submission_media").update({
      duplicate_status: "duplicate",
      content_candidate: false,
      content_status: "rejected",
      owner_reviewed_at: new Date().toISOString(),
      owner_review_note: "เจ้าของยืนยันว่าเป็นสื่อซ้ำจากหน้าคัด Content",
    }).eq("id", mediaId);
    if (error) redirect("/content-pool?duplicate=failed");
    await kpi.from("content_automation_queue").delete().eq("media_id", mediaId);
    if (media.submission_id) await kpi.rpc("refresh_daily_work_submission", { p_submission_id: media.submission_id });
    revalidatePath("/content-pool");
    redirect("/content-pool?duplicate=confirmed");
  }

  const { error } = await kpi.from("work_submission_media").update({
    duplicate_status: "unique",
    owner_reviewed_at: new Date().toISOString(),
    owner_review_note: "เจ้าของตรวจแล้ว ยืนยันว่าเป็นสื่อคนละรายการ",
  }).eq("id", mediaId);
  if (error) redirect("/content-pool?duplicate=failed");
  revalidatePath("/content-pool");
  redirect("/content-pool?duplicate=unique");
}

async function reviewContent(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  if (!id || !["approved", "rejected"].includes(decision)) redirect("/content-pool?review=invalid");
  const kpi = createKpiSupabaseAdminClient();
  if (!kpi) redirect("/content-pool?review=config");
  const now = new Date().toISOString();

  let captionText: string | null = null;
  let captionStatus = decision === "approved" ? "pending" : "not_started";
  if (decision === "approved") {
    try {
      const { data: row, error: rowError } = await kpi.from("content_automation_queue")
        .select("source_type,source_work_date,work_submission_media(storage_bucket,storage_path,content_type)")
        .eq("id", id).eq("owner_status", "pending").maybeSingle();
      if (rowError || !row) throw rowError ?? new Error("ไม่พบ Content");
      const rawMedia = row.work_submission_media as MediaRow | MediaRow[] | null;
      const media = Array.isArray(rawMedia) ? rawMedia[0] ?? null : rawMedia;
      let signedUrl: string | null = null;
      if (media?.storage_path && row.source_type !== "video") {
        const { data: signed } = await kpi.storage.from(media.storage_bucket ?? "employee-footage").createSignedUrl(media.storage_path, 600);
        signedUrl = signed?.signedUrl ?? null;
      }
      captionText = await generateContentCaption({ imageUrl: signedUrl, sourceType: row.source_type, workDate: row.source_work_date });
      captionStatus = "ready";
    } catch (error) {
      console.error("AI caption generation failed", { id, error });
      captionStatus = "failed";
    }
  }

  const { data, error } = await kpi.from("content_automation_queue").update({ owner_status: decision, selection_status: decision === "approved" ? "selected" : "rejected", caption_status: captionStatus, caption_text: captionText, owner_reviewed_at: now, updated_at: now })
    .eq("id", id).eq("owner_status", "pending").select("id").maybeSingle();
  if (error || !data) redirect(`/content-pool?review=failed&message=${encodeURIComponent(error?.message ?? "รายการนี้ถูกดำเนินการไปแล้ว")}`);
  revalidatePath("/content-pool"); revalidatePath("/content-ready");
  redirect(`/content-pool?review=${captionStatus === "failed" ? "caption-failed" : "success"}`);
}

export default async function ContentPoolPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await getCurrentProfile(); if (!isOwner(profile)) redirect("/dashboard");
  const kpi = createKpiSupabaseAdminClient(); if (!kpi) return <main className="mx-auto max-w-xl p-4"><div className="rounded-3xl border bg-white p-6 font-bold">ยังไม่ได้ตั้งค่า KPI Supabase บน Production</div></main>;
  const params = searchParams ? await searchParams : {};
  const review = typeof params.review === "string" ? params.review : "";
  const duplicate = typeof params.duplicate === "string" ? params.duplicate : "";
  const reviewMessage = typeof params.message === "string" ? params.message : "";
  const { data: items, error } = await kpi.from("content_automation_queue")
    .select("id,media_id,source_type,aspect_ratio,source_work_date,created_at,work_submission_media(id,submission_id,storage_bucket,storage_path,content_type,duplicate_status,duplicate_similarity,duplicate_of_media_id)")
    .eq("owner_status", "pending").order("created_at", { ascending: false }).limit(30);
  if (error) return <main className="mx-auto max-w-xl p-4"><div className="rounded-3xl border bg-white p-6 font-bold">โหลด Content Queue ไม่สำเร็จ: {error.message}</div></main>;

  const rows = (items ?? []) as QueueRow[];
  const cards: ContentCard[] = await Promise.all(rows.map(async (item) => {
    const media = Array.isArray(item.work_submission_media) ? (item.work_submission_media[0] ?? null) : item.work_submission_media;
    let url: string | null = null;
    if (media?.storage_path) {
      const { data } = await kpi.storage.from(media.storage_bucket ?? "employee-footage").createSignedUrl(media.storage_path, 3600);
      url = data?.signedUrl ?? null;
    }
    const similarity = media?.duplicate_similarity == null ? null : Number(media.duplicate_similarity);
    const suspectDuplicate = item.source_type === "image" && media?.duplicate_status === "suspected" && Boolean(media.duplicate_of_media_id);
    let originalUrl: string | null = null;
    if (suspectDuplicate && media?.duplicate_of_media_id) {
      const { data: original } = await kpi.from("work_submission_media").select("storage_bucket,storage_path").eq("id", media.duplicate_of_media_id).maybeSingle();
      if (original?.storage_path) {
        const { data: signed } = await kpi.storage.from(original.storage_bucket ?? "employee-footage").createSignedUrl(original.storage_path, 3600);
        originalUrl = signed?.signedUrl ?? null;
      }
    }
    return { ...item, media, url, suspectDuplicate, originalUrl, similarity };
  }));

  return <main className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 pb-24">
    <header className="sticky top-0 z-10 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur"><p className="text-xs font-bold text-red-600">OWNER • CONTENT</p><div className="flex items-end justify-between gap-3"><div><h1 className="text-2xl font-black">คัด Content</h1><p className="text-sm text-black/55">ผ่าน KPI แล้ว • รอคุณเลือก</p></div><div className="rounded-2xl bg-black px-3 py-2 text-center text-white"><div className="text-xl font-black">{cards.length}</div><div className="text-[10px]">รอคัด</div></div></div><Link href="/content-ready" className="mt-4 block w-full rounded-2xl bg-red-600 px-4 py-3 text-center font-black text-white shadow-sm">ตรวจแคปชัน AI →</Link></header>
    {duplicate === "confirmed" ? <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">ยืนยันสื่อซ้ำแล้ว • ไม่นับ KPI และนำออกจาก Content Queue</div> : null}
    {duplicate === "unique" ? <div className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-800">ตรวจแล้ว • ยืนยันว่าเป็นสื่อคนละรายการ</div> : null}
    {duplicate === "failed" ? <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">บันทึกผลตรวจสื่อซ้ำไม่สำเร็จ</div> : null}
    {review === "success" ? <div className="rounded-2xl bg-green-50 p-3 text-sm font-bold text-green-800">ผ่านแล้ว • AI สร้างแคปชันเรียบร้อย</div> : null}
    {review === "caption-failed" ? <div className="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800">ผ่าน Content แล้ว แต่ AI สร้างแคปชันไม่สำเร็จ ระบบเก็บรายการไว้ให้แก้ต่อได้</div> : null}
    {review === "failed" ? <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">บันทึกผลไม่สำเร็จ{reviewMessage ? `: ${reviewMessage}` : ""}</div> : null}
    {cards.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-center font-bold text-black/50">ไม่มี Content รอพิจารณา</div> : cards.map((item) => <article key={item.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="bg-black">{item.url ? item.source_type === "video" ? <video src={item.url} controls playsInline className="max-h-[70vh] w-full object-contain" /> : <img src={item.url} alt="ผลงานพนักงาน" className="max-h-[70vh] w-full object-contain" /> : <div className="p-16 text-center text-white/60">เปิดไฟล์ไม่ได้</div>}</div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-black/50"><span>{item.source_type === "video" ? "🎬 คลิป" : "📷 รูป"}</span><span>{item.source_work_date ?? ""} {item.aspect_ratio ? `• ${item.aspect_ratio}` : ""}</span></div>
        {item.suspectDuplicate ? <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-3"><div className="font-black text-amber-900">⚠️ สงสัยสื่อซ้ำ</div><p className="mt-1 text-sm text-amber-900">ระบบพบภาพก่อนหน้าที่คล้ายกัน {Math.round((item.similarity ?? 0) * 100)}% • ยังไม่ตัด KPI จนกว่าคุณยืนยัน</p>{item.originalUrl ? <div className="mt-3 grid grid-cols-2 gap-2"><div><div className="mb-1 text-center text-xs font-bold">ภาพที่ส่งใหม่</div>{item.url ? <img src={item.url} alt="ภาพใหม่" className="aspect-[9/16] w-full rounded-xl object-cover" /> : null}</div><div><div className="mb-1 text-center text-xs font-bold">ภาพเดิมที่คล้าย</div><img src={item.originalUrl} alt="ภาพเดิม" className="aspect-[9/16] w-full rounded-xl object-cover" /></div></div> : null}<div className="mt-3 grid grid-cols-2 gap-2"><form action={reviewSuspectedDuplicate}><input type="hidden" name="media_id" value={item.media?.id ?? item.media_id ?? ""} /><input type="hidden" name="duplicate_decision" value="unique" /><button className="w-full rounded-xl border border-amber-700 bg-white px-2 py-3 text-sm font-black">ไม่ซ้ำ</button></form><form action={reviewSuspectedDuplicate}><input type="hidden" name="media_id" value={item.media?.id ?? item.media_id ?? ""} /><input type="hidden" name="duplicate_decision" value="duplicate" /><button className="w-full rounded-xl bg-red-600 px-2 py-3 text-sm font-black text-white">ยืนยันว่าซ้ำ</button></form></div></div> : <ReviewButtons id={item.id} action={reviewContent} />}
      </div>
    </article>)}
  </main>;
}
