"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type LoginState = {
  message: string;
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  next: z.string().optional().default("/dashboard"),
});

function normalizeRedirectPath(nextPath: string) {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/dashboard";
  if (nextPath.startsWith("/login")) return "/dashboard";
  return nextPath;
}

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { message: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { message: "ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key" };
  }

  const { email, password, next } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (error) {
    return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect(normalizeRedirectPath(next));
}
