"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const termKeys = ["term_equipment", "term_extra_equipment", "term_chicken_price", "term_free_shipping", "term_no_exclusive", "term_location_check", "term_not_approved", "term_no_payment", "term_privacy"] as const;

const schema = z.object({
  full_name: z.string().trim().min(2), age: z.coerce.number().int().min(15).max(100), phone: z.string().trim().regex(/^(0|\+66)[0-9\-\s]{8,14}$/), line_id: z.string().trim().optional(), current_occupation: z.string().trim().min(1), residence_province: z.string().trim().min(1), residence_district: z.string().trim().min(1),
  opening_province: z.string().trim().min(1), opening_district: z.string().trim().min(1), opening_subdistrict: z.string().trim().min(1), location_address: z.string().trim().min(1), google_maps_url: z.string().trim().url().refine((v) => /google\.|goo\.gl|maps\.app\.goo\.gl/i.test(v)), location_type: z.string().trim().min(1), monthly_rent: z.string().trim().optional(), planned_opening_period: z.string().trim().min(1), nearby_competitors: z.string().trim().optional(),
  has_location: z.string().trim().min(1), actual_seller: z.string().trim().min(1), ready_to_open: z.string().trim().min(1), food_business_experience: z.string().trim().min(1), experience_details: z.string().trim().optional(), can_follow_online_course: z.literal("true"), extra_budget_range: z.string().trim().min(1), source: z.string().trim().optional(), website: z.string().max(0).optional(), started_at: z.coerce.number().optional(),
}).passthrough();

export type MiniApplyFormState = { ok: boolean; message: string; referenceCode?: string };

export async function submitMiniApplication(_prev: MiniApplyFormState, formData: FormData): Promise<MiniApplyFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "กรุณากรอกข้อมูลบังคับให้ครบ ตรวจสอบเบอร์โทร และลิงก์ Google Maps" };
  if (parsed.data.website) return { ok: false, message: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  if (parsed.data.started_at && Date.now() - parsed.data.started_at < 3000) return { ok: false, message: "กรุณาตรวจสอบข้อมูลก่อนส่งอีกครั้ง" };
  const terms = Object.fromEntries(termKeys.map((key) => [key, formData.get(key) === "true"]));
  if (Object.values(terms).some((v) => !v)) return { ok: false, message: "กรุณายอมรับเงื่อนไขทุกข้อก่อนส่งใบสมัคร" };

  const photos = formData.getAll("location_photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length < 1) return { ok: false, message: "กรุณาอัปโหลดรูปภาพทำเลอย่างน้อย 1 รูป" };
  if (photos.some((f) => f.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(f.type))) return { ok: false, message: "รูปภาพต้องเป็น JPG, PNG หรือ WebP และขนาดไม่เกิน 5MB ต่อไฟล์" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase สำหรับรับใบสมัคร" };

  const folder = `applications/${crypto.randomUUID()}`;
  const paths: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${folder}/${index + 1}.${ext}`;
    const { error } = await supabase.storage.from("mini-location-photos").upload(path, photo, { contentType: photo.type, upsert: false });
    if (error) return { ok: false, message: `อัปโหลดรูปไม่สำเร็จ: ${error.message}` };
    paths.push(path);
  }

  const { data, error } = await supabase.from("mini_franchise_applications").insert({ ...parsed.data, line_id: parsed.data.line_id || null, monthly_rent: parsed.data.monthly_rent || null, nearby_competitors: parsed.data.nearby_competitors || null, experience_details: parsed.data.experience_details || null, source: parsed.data.source === "campaign-mini" ? "campaign-mini" : "apply-mini", can_follow_online_course: true, terms_acknowledged: terms, location_photo_paths: paths, status: "new" }).select("reference_code").single();
  if (error) return { ok: false, message: `บันทึกใบสมัครไม่สำเร็จ: ${error.message}` };
  return { ok: true, message: "บริษัทได้รับใบสมัครของท่านแล้ว การส่งใบสมัครยังไม่ถือว่าได้รับสิทธิ์ ทีมงานจะตรวจสอบพื้นที่และความพร้อมก่อนติดต่อกลับ กรุณาอย่าเพิ่งชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติ", referenceCode: data.reference_code };
}
