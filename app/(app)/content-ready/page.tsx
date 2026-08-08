import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createKpiSupabaseAdminClient } from "@/lib/kpi-supabase";

type MediaRow = { storage_bucket: string | null; storage_path: string | null };
type Row = { id:string; source_type:string|null; source_work_date:string|null; caption_status:string; caption_text:string|null; publish_status:string; work_submission_media:MediaRow|MediaRow[]|null };

async function saveCaption(formData: FormData) {
  "use server";
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const id=String(formData.get("id")??"").trim();
  const caption=String(formData.get("caption")??"").trim();
  const kpi=createKpiSupabaseAdminClient();
  if(!kpi||!id) redirect("/content-ready?save=failed");
  const {error}=await kpi.from("content_automation_queue").update({caption_text:caption||null,caption_status:caption?"ready":"pending",updated_at:new Date().toISOString()}).eq("id",id).eq("owner_status","approved");
  if(error) redirect(`/content-ready?save=failed&message=${encodeURIComponent(error.message)}`);
  revalidatePath("/content-ready");
  redirect("/content-ready?save=success");
}

export default async function ContentReadyPage({searchParams}:{searchParams?:Promise<Record<string,string|string[]|undefined>>}) {
  const profile=await getCurrentProfile();
  if(!isOwner(profile)) redirect("/dashboard");
  const kpi=createKpiSupabaseAdminClient();
  if(!kpi) return <main className="mx-auto max-w-xl p-4">ไม่พบการเชื่อมต่อ KPI</main>;
  const params=searchParams?await searchParams:{};
  const save=typeof params.save==="string"?params.save:"";
  const message=typeof params.message==="string"?params.message:"";
  const {data,error}=await kpi.from("content_automation_queue").select("id,source_type,source_work_date,caption_status,caption_text,publish_status,work_submission_media(storage_bucket,storage_path)").eq("owner_status","approved").order("owner_reviewed_at",{ascending:false}).limit(30);
  if(error) return <main className="mx-auto max-w-xl p-4">โหลดรายการไม่สำเร็จ: {error.message}</main>;
  const rows=(data??[]) as Row[];
  const cards=await Promise.all(rows.map(async row=>{const media=Array.isArray(row.work_submission_media)?row.work_submission_media[0]??null:row.work_submission_media;if(!media?.storage_path)return {...row,url:null};const {data:signed}=await kpi.storage.from(media.storage_bucket??"employee-footage").createSignedUrl(media.storage_path,3600);return {...row,url:signed?.signedUrl??null};}));
  return <main className="mx-auto w-full max-w-xl space-y-4 px-3 py-4 pb-24">
    <header className="rounded-3xl border bg-white p-4 shadow-sm"><p className="text-xs font-bold text-red-600">OWNER • CONTENT</p><h1 className="text-2xl font-black">Content ที่ผ่านแล้ว</h1><p className="text-sm text-black/55">เขียน/แก้แคปชันก่อนเชื่อมระบบโพสต์จริง</p><div className="mt-3 inline-flex rounded-2xl bg-black px-4 py-2 font-black text-white">{cards.length} รายการ</div></header>
    {save==="success"?<div className="rounded-2xl bg-green-50 p-3 font-bold text-green-800">บันทึกแคปชันเรียบร้อยแล้ว</div>:null}
    {save==="failed"?<div className="rounded-2xl bg-red-50 p-3 font-bold text-red-800">บันทึกไม่สำเร็จ{message?`: ${message}`:""}</div>:null}
    {cards.length===0?<div className="rounded-3xl border bg-white p-8 text-center font-bold text-black/50">ยังไม่มี Content ที่ผ่าน</div>:cards.map(item=><article key={item.id} className="overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="bg-black">{item.url?(item.source_type==="video"?<video src={item.url} controls playsInline className="max-h-[70vh] w-full object-contain"/>:<img src={item.url} alt="Content ที่ผ่าน" className="max-h-[70vh] w-full object-contain"/>):<div className="p-16 text-center text-white/60">เปิดไฟล์ไม่ได้</div>}</div><form action={saveCaption} className="space-y-3 p-4"><input type="hidden" name="id" value={item.id}/><div className="flex justify-between text-xs font-bold text-black/50"><span>{item.source_type==="video"?"🎬 คลิป":"📷 รูป"}</span><span>{item.source_work_date??""} • {item.caption_status==="ready"?"แคปชันพร้อม":"รอแคปชัน"}</span></div><textarea name="caption" defaultValue={item.caption_text??""} rows={5} placeholder="เขียนหรือวางแคปชันสำหรับโพสต์นี้..." className="w-full rounded-2xl border border-black/15 p-3 text-base outline-none focus:border-black"/><button type="submit" className="w-full rounded-2xl bg-black px-4 py-3 font-black text-white">บันทึกแคปชัน</button><p className="text-center text-xs text-black/45">สถานะโพสต์: {item.publish_status}</p></form></article>)}
  </main>;
}
