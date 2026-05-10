"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="focus-ring min-h-16 w-full rounded-3xl bg-[#ffc400] text-xl font-black text-black shadow-lg disabled:opacity-60">
      {pending ? "กำลังบันทึก..." : "บันทึกข้อมูลวันนี้"}
    </button>
  );
}
