"use client";

import { useFormStatus } from "react-dom";

export function ShipmentSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-xl bg-[#E60012] p-3 font-black text-white disabled:cursor-wait disabled:bg-slate-400"
    >
      {pending ? "กำลังตรวจและบันทึก..." : "ตรวจสอบและยืนยันจัดสินค้า"}
    </button>
  );
}
