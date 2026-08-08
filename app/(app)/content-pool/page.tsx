import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type MediaRow = {
  storage_bucket: string | null;
  storage_path: string | null;
  content_type: string | null;
};

type QueueRow = {
  id: string;
  media_id: string | null;
  source_type: string | null;
  aspect_ratio: string | null;
  source_work_date: string | null;
  created_at: string;
  work_submission_media: MediaRow | MediaRow[] | null;
};

type ContentCard = QueueRow & { media: MediaRow | null; url: string | null };

async function reviewContent(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) return;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await supabase.from("content_automation_queue").update({
    owner_status: decision,
    selection_status: decision === "approved" ? "selected" : "rejected",
    caption_status: decision === "approved" ? "pending" : "not_started",
    owner_reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  revalidatePath("/content-pool");
}

export default async function ContentPoolPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return <main className="p-4">ระบบยังไม่พร้อมใช้งาน</main>;

  const { data: items } = await supabase
    .from("content_automation_queue")
    .select("id,media_id,source_type,aspect_ratio,source_work_date,created_at,work_submission_media(storage_bucket,storage_path,content_type)")
    .eq("owner_status", "pending")
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = (items ?? []) as QueueRow[];
  const cards: ContentCard[] = await Promise.all(rows.map(async (item) => {
    const media = Array.isArray(item.work_submission_media) ? (item.work_submission_media[0] ?? null) : item.work_submission_media;
    if (!media?.storage_path) return { ...item, media, url: null };
    const { data } = await supabase.storage.from(media.storage_bucket ?? "employee-footage").createSignedUrl(media.storage_path, 3600);
    return { ...item, media, url: data?.signedUrl ?? null };
  }));

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 pb-24">
      <header className="sticky top-0 z-10 rounded-3xl border bg-white/95 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-bold text-red-600">OWNER • CONTENT</p>
        <div className="flex items-end justify-between gap-3">
          <div><h1 className="text-2xl font-black">คัด Content</h1><p className="text-sm text-black/55">ผ่าน KPI แล้ว • รอคุณเลือก</p></div>
          <div className="rounded-2xl bg-black px-3 py-2 text-center text-white"><div className="text-xl font-black">{cards.length}</div><div className="text-[10px]">รอคัด</div></div>
        </div>
      </header>

      {cards.length === 0 ? <div className="rounded-3xl border bg-white p-8 text-center font-bold text-black/50">ไม่มี Content รอพิจารณา</div> : cards.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="bg-black">
            {item.url ? item.source_type === "video" ? (
              <video src={item.url} controls playsInline className="max-h-[70vh] w-full object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt="ผลงานพนักงาน" className="max-h-[70vh] w-full object-contain" />
            ) : <div className="p-16 text-center text-white/60">เปิดไฟล์ไม่ได้</div>}
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between text-xs font-bold text-black/50">
              <span>{item.source_type === "video" ? "🎬 คลิป" : "📷 รูป"}</span>
              <span>{item.source_work_date ?? ""} {item.aspect_ratio ? `• ${item.aspect_ratio}` : ""}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <form action={reviewContent}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="rejected"/><button className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-base font-black">ไม่ใช้</button></form>
              <form action={reviewContent}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="decision" value="approved"/><button className="w-full rounded-2xl bg-black px-4 py-3 text-base font-black text-white">✓ ผ่าน</button></form>
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
