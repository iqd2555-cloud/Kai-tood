"use client";

import { useMemo, useState } from "react";

type BranchOption = { id: string; name: string };

type SubmitResult = { ok: boolean; caseNumber?: string; message?: string };

export default function FeedbackForm({ branches }: { branches: BranchOption[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const today = useMemo(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }), []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const response = await fetch("/api/customer-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await response.json()) as SubmitResult;
      setResult(body);
      if (body.ok) form.reset();
    } catch {
      setResult({ ok: false, message: "ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center shadow-sm">
        <div className="text-4xl">✓</div>
        <h2 className="mt-3 text-xl font-bold text-slate-900">ได้รับข้อมูลแล้ว</h2>
        <p className="mt-2 text-slate-700">เลขที่รับเรื่อง</p>
        <p className="mt-1 text-2xl font-black tracking-wide text-slate-950">{result.caseNumber}</p>
        <p className="mt-3 text-sm text-slate-600">บริษัทจะตรวจสอบข้อเท็จจริงและนำข้อมูลไปปรับปรุงการบริการ</p>
        <button className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white" onClick={() => setResult(null)}>
          ส่งความคิดเห็นเพิ่มเติม
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">สาขา *</label>
        <select name="branch_id" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-700">
          <option value="" disabled>เลือกสาขา</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">วันที่ใช้บริการ *</label>
          <input name="service_date" type="date" max={today} required className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">เวลาประมาณ</label>
          <input name="service_time" type="time" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">เรื่องที่ต้องการแจ้ง *</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {[['complaint','แจ้งปัญหาการบริการ'],['suggestion','ข้อเสนอแนะ'],['compliment','ชื่นชมพนักงาน']].map(([value,label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="radio" name="feedback_type" value={value} required /> {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">รายละเอียด *</label>
        <textarea name="details" required minLength={5} maxLength={3000} rows={6} placeholder="กรุณาเล่าเหตุการณ์ที่พบ เพื่อให้เราตรวจสอบได้ตรงจุด" className="w-full rounded-xl border border-slate-300 px-4 py-3" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">ชื่อ (ไม่บังคับ)</label>
          <input name="customer_name" maxLength={120} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">เบอร์โทร / LINE (ไม่บังคับ)</label>
          <input name="customer_contact" maxLength={120} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">ข้อมูลจะใช้เพื่อการตรวจสอบและปรับปรุงการบริการของบริษัทเท่านั้น</p>
      {result?.message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.message}</p>}
      <button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 font-bold text-white disabled:opacity-60">
        {submitting ? "กำลังส่ง..." : "ส่งความคิดเห็น"}
      </button>
    </form>
  );
}
