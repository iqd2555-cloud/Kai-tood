"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "./actions";
import { isSupabaseConfigured } from "@/lib/supabase-env";

const initialState: LoginState = { message: "" };

function LoginButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending || disabled}
      className="focus-ring min-h-14 w-full rounded-2xl bg-[#ffc400] text-xl font-black text-black shadow-lg disabled:opacity-60"
    >
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </button>
  );
}

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [state, formAction] = useActionState(login, initialState);
  const isConfigured = isSupabaseConfigured();

  return (
    <form action={formAction} className="space-y-5">
      <input name="next" type="hidden" value={next} />
      <label className="block">
        <span className="mb-2 block font-black">อีเมล</span>
        <input
          className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          required
        />
      </label>
      <label className="block">
        <span className="mb-2 block font-black">รหัสผ่าน</span>
        <input
          className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {!isConfigured && (
        <div className="rounded-2xl bg-yellow-50 p-3 font-bold text-yellow-900">
          ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY บน Vercel
        </div>
      )}
      {state.message && <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{state.message}</div>}
      <LoginButton disabled={!isConfigured} />
    </form>
  );
}
