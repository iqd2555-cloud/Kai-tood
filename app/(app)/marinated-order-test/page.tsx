import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { CUSTOMER_MASTER, parseMarinatedOrder, priceOrder } from "@/lib/marinated-order-parser";

type Params = { raw?: string; customer?: string };

export default async function MarinatedOrderTestPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const customer = CUSTOMER_MASTER.find((c) => c.id === params.customer);
  const raw = params.raw ?? "";
  const result = raw ? parseMarinatedOrder(raw, customer) : null;
  const pricing = result && customer ? priceOrder(result, customer) : null;

  return <div className="space-y-5">
    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-xl">
      <p className="text-sm font-black text-[#E60012]">TEST MODE · ไม่บันทึกสต๊อก/ออเดอร์จริง</p>
      <h1 className="mt-2 text-3xl font-black">ทดสอบอ่านออเดอร์ไก่หมัก</h1>
      <p className="mt-2 text-white/70">วางข้อความจริงจาก LINE เพื่อทดสอบการตีความก่อนเชื่อม Automation</p>
    </section>

    <form className="space-y-4 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <label className="block"><span className="mb-2 block font-black">ลูกค้า</span>
        <select name="customer" defaultValue={customer?.id ?? ""} className="min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 font-bold">
          <option value="">-- เลือกลูกค้า --</option>{CUSTOMER_MASTER.map(c => <option key={c.id} value={c.id}>{c.name}{c.group ? ` · กลุ่ม ${c.group}` : ""}</option>)}
        </select>
      </label>
      <label className="block"><span className="mb-2 block font-black">ข้อความออเดอร์จาก LINE</span>
        <textarea name="raw" defaultValue={raw} rows={8} className="w-full rounded-2xl border-2 border-black/10 p-4 text-lg font-bold" placeholder={'เช่น\nดั้งงเดิม 20 ก.ก\nทอดพริก 15 กก\nตับ 10 กก'} />
      </label>
      <button className="min-h-14 rounded-2xl bg-[#E60012] px-6 text-lg font-black text-white">วิเคราะห์ข้อความ</button>
    </form>

    {result && <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">ผลการอ่าน</h2><span className={`rounded-full px-3 py-1 text-sm font-black ${result.needsReview ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"}`}>{result.needsReview ? "ต้องตรวจสอบ" : "ผ่าน Validation"}</span></div>
      <div className="mt-4 space-y-2">{result.items.map(item => <div key={item.product} className="flex justify-between rounded-2xl bg-black/5 p-4 text-lg font-black"><span>{item.name}</span><span>{item.kg} กก.</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-[#111] p-4 text-white"><div className="flex justify-between text-xl font-black"><span>รวม</span><span>{result.totalKg} กก.</span></div>{pricing?.pricePerKg && <div className="mt-2 flex justify-between font-bold text-white/80"><span>{pricing.pricePerKg} บาท/กก.</span><span>{pricing.total?.toLocaleString("th-TH")} บาท</span></div>}</div>
      {customer?.shippingInstruction && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-black text-red-700">ขนส่ง: {customer.shippingInstruction}</p>}
      {pricing?.warning && <p className="mt-3 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">⚠️ {pricing.warning}</p>}
      {result.warnings.map((w, i) => <p key={i} className="mt-3 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">⚠️ {w}</p>)}
      <p className="mt-4 text-sm font-bold text-black/50">หน้านี้เป็น Sandbox: ไม่มี INSERT/UPDATE ไปยังตารางออเดอร์ สต๊อก Cash Flow หรือโรงหมัก</p>
    </section>}
  </div>;
}
