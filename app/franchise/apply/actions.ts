"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const leadSchema = z.object({
  full_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  line_id: z.string().trim().optional(),
  province: z.string().trim().min(1),
  district: z.string().trim().optional(),
  current_job: z.string().trim().optional(),
  available_time_per_day: z.string().trim().optional(),
  budget_range: z.string().trim().min(1),
  has_location: z.string().trim().min(1),
  location_type: z.string().trim().optional(),
  expected_daily_income: z.string().trim().optional(),
  business_experience: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export type ApplyFormState = { ok: boolean; message: string };

export async function submitFranchiseLead(_prevState: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "ยังไม่ได้ตั้งค่า Supabase สำหรับรับข้อมูล" };

  const { error } = await supabase.from("franchise_leads").insert(parsed.data);
  if (error) return { ok: false, message: `ส่งข้อมูลไม่สำเร็จ: ${error.message}` };
  redirect("/franchise/apply?success=1");
}
