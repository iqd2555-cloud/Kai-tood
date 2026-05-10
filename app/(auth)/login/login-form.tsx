"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";
import { isSupabaseConfigured } from "@/lib/supabase-env";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isConfigured = isSupabaseConfigured();

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      setError("ยังไม่ได้ตั้งค่า Supabase URL หรือ Anon Key");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block font-black">อีเมล</span>
        <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="mb-2 block font-black">รหัสผ่าน</span>
        <input className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 text-lg font-bold" name="password" type="password" autoComplete="current-password" required />
      </label>
      {!isConfigured && (
        <div className="rounded-2xl bg-yellow-50 p-3 font-bold text-yellow-900">
          ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY บน Vercel
        </div>
      )}
      {error && <div className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</div>}
      <button disabled={loading || !isConfigured} className="focus-ring min-h-14 w-full rounded-2xl bg-[#ffc400] text-xl font-black text-black shadow-lg disabled:opacity-60">
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
