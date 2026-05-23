"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { login, signup, type AuthFormState } from "./actions";
import { isSupabaseConfigured } from "@/lib/supabase-env";

const initialState: AuthFormState = { message: "", success: "" };

type Mode = "login" | "signup";

function SubmitButton({ disabled, mode }: { disabled: boolean; mode: Mode }) {
  const { pending } = useFormStatus();
  const label = mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
  const pendingLabel = mode === "login" ? "กำลังเข้าสู่ระบบ..." : "กำลังสมัครสมาชิก...";

  return (
    <button
      disabled={pending || disabled}
      className="focus-ring min-h-14 w-full rounded-2xl bg-[#ffc400] text-xl font-black text-black shadow-lg disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, loginAction] = useActionState(login, initialState);
  const [signupState, signupAction] = useActionState(signup, initialState);
  const isConfigured = isSupabaseConfigured();

  const currentState = mode === "login" ? loginState : signupState;
  const currentAction = useMemo(() => (mode === "login" ? loginAction : signupAction), [mode, loginAction, signupAction]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/5 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`min-h-12 rounded-xl px-3 text-base font-black ${
            mode === "login" ? "bg-black text-white" : "text-black/70"
          }`}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`min-h-12 rounded-xl px-3 text-base font-black ${
            mode === "signup" ? "bg-black text-white" : "text-black/70"
          }`}
        >
          สมัครสมาชิก
        </button>
      </div>

      <form action={currentAction} className="space-y-5">
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </label>

        {!isConfigured && (
          <div className="rounded-2xl bg-yellow-50 p-3 font-bold text-yellow-900">
            ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY บน Vercel
          </div>
        )}

        {currentState.message && <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{currentState.message}</div>}
        {currentState.success && <div className="rounded-2xl bg-emerald-50 p-3 font-bold text-emerald-700">{currentState.success}</div>}
        <SubmitButton disabled={!isConfigured} mode={mode} />
      </form>
    </div>
  );
}
