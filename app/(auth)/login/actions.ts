"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureProfileForUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
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
  return completeImmediateLogin(normalizedEmail, password, next);
}

function isExistingUserError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("already been registered") ||
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("user exists")
  );
}

function isEmailConfirmationError(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

const immediateSignupSetupMessage =
  "Supabase ยังเปิด Confirm email หรือยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บน Vercel จึงไม่สามารถให้ผู้ใช้ใหม่เข้าใช้งานทันทีได้ กรุณาเพิ่ม SUPABASE_SERVICE_ROLE_KEY เป็น Server Environment Variable และปิด Confirm email ใน Supabase Auth > Providers > Email";

async function confirmExistingEmail(email: string) {
  const adminSupabase = createSupabaseAdminClient();
  if (!adminSupabase) return { ok: false, message: "" };

  let page = 1;
  const perPage = 1000;
  let existingUser: { id: string; email?: string | null; email_confirmed_at?: string | null } | null = null;

  while (!existingUser) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) return { ok: false, message: error.message };

    existingUser = data.users.find((user) => user.email?.toLowerCase() === email) ?? null;
    if (existingUser || data.users.length < perPage) break;
    page += 1;
  }

  if (!existingUser) return { ok: false, message: "ไม่พบผู้ใช้ใน Supabase Auth" };
  if (existingUser.email_confirmed_at) return { ok: true, message: "" };

  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(existingUser.id, { email_confirm: true });
  if (updateError) return { ok: false, message: updateError.message };

  return { ok: true, message: "" };
}

async function completeImmediateLogin(email: string, password: string, next: string, shouldRetryAfterConfirm = true): Promise<AuthFormState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { message: "ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key", success: "" };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (shouldRetryAfterConfirm && isEmailConfirmationError(error.message)) {
      const confirmResult = await confirmExistingEmail(email);
      if (confirmResult.ok) return completeImmediateLogin(email, password, next, false);
      const confirmMessage = confirmResult.message ? ` (${confirmResult.message})` : "";
      return {
        message: `Supabase: ${error.message} ${immediateSignupSetupMessage}${confirmMessage}`,
        success: "",
      };
    }

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

  const { email, password, next } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const fullName = normalizedEmail.split("@")[0];
  const adminSupabase = createSupabaseAdminClient();

  if (adminSupabase) {
    const { error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createUserError) {
      if (!isExistingUserError(createUserError.message)) {
        return { message: `Supabase: ${createUserError.message}`, success: "" };
      }

      const confirmResult = await confirmExistingEmail(normalizedEmail);
      if (!confirmResult.ok) {
        const confirmMessage = confirmResult.message ? ` (${confirmResult.message})` : "";
        return { message: `Supabase: ไม่สามารถยืนยันอีเมลผู้ใช้เดิมได้${confirmMessage}`, success: "" };
      }
    }

    return completeImmediateLogin(normalizedEmail, password, next);
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: undefined,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { message: `Supabase: ${error.message}`, success: "" };
  }

  if (session?.user) {
    const profileResult = await ensureProfileForUser(session.user);
    if (!profileResult.ok) {
      await supabase.auth.signOut();
      return { message: profileResult.message, success: "" };
    }

    redirect(normalizeRedirectPath(next));
  }

  return {
    message: `สมัครสมาชิกสำเร็จ แต่ยังเข้าใช้งานทันทีไม่ได้: ${immediateSignupSetupMessage}`,
    success: "",
  };
}
