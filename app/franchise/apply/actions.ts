"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { thaiAddress, thaiProvinces } from "@/lib/thai-address";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const leadSchema = z.object({
  full_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  line_id: z.string().trim().optional(),
  province: z.string().trim().min(1),
  district: z.string().trim().min(1),
  has_location: z.string().trim().min(1),
  location_type: z.string().trim().min(1),
  budget_range: z.string().trim().min(1),
  working_capital: z.string().trim().min(1),
  available_time_per_day: z.string().trim().min(1),
  business_experience: z.string().trim().min(1),
  expected_daily_income: z.string().trim().min(1),
  understanding_confirmed: z.literal("true"),
}).refine((data) => thaiProvinces.includes(data.province as (typeof thaiProvinces)[number]), {
  message: "invalid province",
  path: ["province"],
}).refine((data) => thaiAddress[data.province]?.includes(data.district), {
  message: "invalid district",
  path: ["district"],
});

export type ApplyFormState = { ok: boolean; message: string };

export async function submitFranchiseLead(_prevState: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ และยืนยันความเข้าใจ" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase สำหรับรับข้อมูล" };

  const lead = { ...parsed.data, understanding_confirmed: true };
  const { error } = await supabase.from("franchise_leads").insert(lead);
  if (error) return { ok: false, message: `ส่งข้อมูลไม่สำเร็จ: ${error.message}` };
  redirect("/franchise/apply?success=1");
}
