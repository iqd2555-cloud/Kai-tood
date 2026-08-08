"use client";

import { useFormStatus } from "react-dom";

function ReviewButton({ decision }: { decision: "approved" | "rejected" }) {
  const { pending } = useFormStatus();
  const approved = decision === "approved";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`w-full touch-manipulation rounded-2xl px-4 py-3 text-base font-black transition-opacity disabled:cursor-wait disabled:opacity-55 ${
        approved ? "bg-black text-white" : "border border-black/15 bg-white text-black"
      }`}
    >
      {pending ? "กำลังบันทึก..." : approved ? "✓ ผ่าน" : "ไม่ใช้"}
    </button>
  );
}

export function ReviewButtons({ id, action }: { id: string; action: (formData: FormData) => void | Promise<void> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="rejected" />
        <ReviewButton decision="rejected" />
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="decision" value="approved" />
        <ReviewButton decision="approved" />
      </form>
    </div>
  );
}
