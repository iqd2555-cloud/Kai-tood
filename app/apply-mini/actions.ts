"use server";

import { z } from "zod";
import { getThaiDistricts, getThaiSubdistricts, thaiProvinces } from "@/lib/thai-address";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const termKeys = ["term_equipment", "term_extra_equipment", "term_chicken_price", "term_free_shipping", "term_no_exclusive", "term_location_check", "term_not_approved", "term_no_payment", "term_privacy"] as const;

const schema = z.object({
  full_name: z.string().trim().min(2), age: z.coerce.number().int().min(15).max(100), phone: z.string().trim().regex(/^(0|\+66)[0-9\-\s]{8,14}$/), line_id: z.string().trim().optional(), current_occupation: z.string().trim().min(1), residence_province: z.string().trim().min(1), residence_district: z.string().trim().min(1),
  opening_province: z.string().trim().min(1), opening_district: z.string().trim().min(1), opening_subdistrict: z.string().trim().min(1), location_address: z.string().trim().min(1), location_description: z.string().trim().min(1, "กรุณาระบุสถานที่ จุดสังเกต หรือพิกัดโดยประมาณ").max(500), google_maps_url: z.string().trim().max(500).optional(), location_type: z.string().trim().min(1), monthly_rent: z.string().trim().optional(), planned_opening_period: z.string().trim().min(1), nearby_competitors: z.string().trim().optional(), submission_token: z.string().trim().min(20).max(80),
  has_location: z.string().trim().min(1), actual_seller: z.string().trim().min(1), ready_to_open: z.string().trim().min(1), food_business_experience: z.string().trim().min(1), experience_details: z.string().trim().optional(), can_follow_online_course: z.literal("true"), extra_budget_range: z.string().trim().min(1), source: z.string().trim().optional(), website: z.string().max(0).optional(), started_at: z.coerce.number().optional(),
}).passthrough();

export type MiniApplyFormState = { ok: boolean; message: string; applicationId?: string; referenceCode?: string };

export async function submitMiniApplication(_prev: MiniApplyFormState, formData: FormData): Promise<MiniApplyFormState> {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.flatten().fieldErrors.location_description?.[0] ?? "กรุณากรอกข้อมูลบังคับให้ครบ และตรวจสอบเบอร์โทร" };
  if (parsed.data.website) return { ok: false, message: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  if (parsed.data.started_at && Date.now() - parsed.data.started_at < 3000) return { ok: false, message: "กรุณาตรวจสอบข้อมูลก่อนส่งอีกครั้ง" };
  if (!thaiProvinces.includes(parsed.data.opening_province as (typeof thaiProvinces)[number])) return { ok: false, message: "กรุณาเลือกจังหวัดจากรายการ" };
  if (!getThaiDistricts(parsed.data.opening_province).includes(parsed.data.opening_district)) return { ok: false, message: "กรุณาเลือกอำเภอ/เขตให้ตรงกับจังหวัด" };
  if (!getThaiSubdistricts(parsed.data.opening_province, parsed.data.opening_district).includes(parsed.data.opening_subdistrict)) return { ok: false, message: "กรุณาเลือกตำบล/แขวงให้ตรงกับอำเภอ/เขต" };

  const terms = Object.fromEntries(termKeys.map((key) => [key, formData.get(key) === "true"]));
  if (Object.values(terms).some((v) => !v)) return { ok: false, message: "กรุณายอมรับเงื่อนไขทุกข้อก่อนส่งใบสมัคร" };

  const photos = formData.getAll("location_photos").filter((f): f is File => f instanceof File && f.size > 0);
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

  // The public form intentionally has INSERT-only RLS access. Asking PostgREST
  // to return the inserted row with `.select()` also requires SELECT access and
  // makes an otherwise valid submission fail. Generate the identifiers in this
  // trusted Server Action, insert once without a representation response, and
  // return the same identifiers to the applicant.
  const applicationId = crypto.randomUUID();
  const referenceCode = `MINI-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const { error } = await supabase.from("mini_franchise_applications").insert({
    id: applicationId,
    reference_code: referenceCode,
    application_type: "mini",
    source: parsed.data.source === "campaign-mini" ? "campaign-mini" : "apply-mini",
    full_name: parsed.data.full_name,
    age: parsed.data.age,
    phone: parsed.data.phone,
    line_id: parsed.data.line_id || null,
    current_occupation: parsed.data.current_occupation,
    residence_province: parsed.data.residence_province,
    residence_district: parsed.data.residence_district,
    opening_province: parsed.data.opening_province,
    opening_district: parsed.data.opening_district,
    opening_subdistrict: parsed.data.opening_subdistrict,
    location_address: parsed.data.location_address,
    location_description: parsed.data.location_description,
    google_maps_url: parsed.data.google_maps_url || null,
    location_type: parsed.data.location_type,
    monthly_rent: parsed.data.monthly_rent || null,
    planned_opening_period: parsed.data.planned_opening_period,
    nearby_competitors: parsed.data.nearby_competitors || null,
    location_photo_paths: paths,
    has_location: parsed.data.has_location,
    actual_seller: parsed.data.actual_seller,
    ready_to_open: parsed.data.ready_to_open,
    food_business_experience: parsed.data.food_business_experience,
    experience_details: parsed.data.experience_details || null,
    can_follow_online_course: true,
    extra_budget_range: parsed.data.extra_budget_range,
    terms_acknowledged: terms,
    submission_token: parsed.data.submission_token,
    status: "new",
  });
  if (error?.code === "23505") {
    return { ok: true, message: "บริษัทได้รับใบสมัครนี้แล้ว การส่งใบสมัครยังไม่ถือว่าได้รับสิทธิ์ ทีมงานจะตรวจสอบพื้นที่และความพร้อมก่อนติดต่อกลับ กรุณาอย่าเพิ่งชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติ" };
  }
  if (error) {
    console.error("Failed to submit MINI franchise application:", { code: error.code, message: error.message, details: error.details });
    return { ok: false, message: "ยังส่งใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง" };
  }
  return { ok: true, message: "บริษัทได้รับใบสมัครของท่านแล้ว การส่งใบสมัครยังไม่ถือว่าได้รับสิทธิ์ ทีมงานจะตรวจสอบพื้นที่และความพร้อมก่อนติดต่อกลับ กรุณาอย่าเพิ่งชำระเงินจนกว่าจะได้รับแจ้งผลอนุมัติ", applicationId, referenceCode };
}
