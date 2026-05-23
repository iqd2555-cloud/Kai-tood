"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureProfileForUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AuthFormState = {
  message: string;
  success: string;
};

const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  next: z.string().optional().default("/dashboard"),
});

function normalizeRedirectPath(nextPath: string) {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/dashboard";
  if (nextPath.startsWith("/login")) return "/dashboard";
  return nextPath;
}

export async function login(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { message: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง (อย่างน้อย 6 ตัวอักษร)", success: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { message: "ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key", success: "" };
  }

  const { email, password, next } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { message: `Supabase: ${error.message}`, success: "" };
  }

  if (!user) {
    return { message: "Supabase: เข้าสู่ระบบสำเร็จแต่ไม่พบข้อมูลผู้ใช้ใน session", success: "" };
  }

  const profileResult = await ensureProfileForUser(user);
  if (!profileResult.ok) {
    await supabase.auth.signOut();
    return { message: profileResult.message, success: "" };
  }

  redirect(normalizeRedirectPath(next));
}

export async function signup(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return { message: "กรุณากรอกอีเมลที่ถูกต้อง และรหัสผ่านอย่างน้อย 6 ตัวอักษร", success: "" };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { message: "ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key", success: "" };
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const { error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: undefined,
      data: {
        full_name: normalizedEmail.split("@")[0],
      },
    },
  });

  if (error) {
    return { message: `Supabase: ${error.message}`, success: "" };
  }

  return {
    message: "",
    success: "สมัครสมาชิกสำเร็จแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านของคุณ",
  };
}
