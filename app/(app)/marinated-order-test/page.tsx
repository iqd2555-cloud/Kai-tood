import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { CUSTOMER_MASTER, parseMarinatedOrder, priceOrder } from "@/lib/marinated-order-parser";
import { runMarinatedOrderRegression } from "@/lib/marinated-order-parser-regression";
import { createMarinatedDraftOrder } from "@/app/(app)/marinated-orders/actions";

type Params = { raw?: string; customer?: string; error?: string };

function formatDeliveryDate(value: string | null) {
  if (!value) return "ไม่พบวันที่ส่งในข้อความ";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

export default async function MarinatedOrderTestPage({ searchParams }: { searchParams?: Promise<Params> }) {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const customer = CUSTOMER_MASTER.find((c) => c.id === params.customer);
  const raw = params.raw ?? "";
  const result = raw ? parseMarinatedOrder(raw, customer) : null;
  const pricing = result && customer ? priceOrder(result, customer) : null;
  const regression = runMarinatedOrderRegression();
  const passed = regression.filter((item) => item.passed).length;

  return <div className="space-y-5">
    <section className="rounded-[2rem] bg-[#111] p-5 text-white shadow-xl">
      <p className="text-sm font-black text-[#E60012]">ORDER PARSER · OWNER CONTROL</p>
      <h1 className="mt-2 text-3xl font-black">รับออเดอร์ไก่หมัก</h1>
      <p className="mt-2 text-white/70">วางข้อความจาก LINE ตรวจผล แล้วบันทึกเป็น Draft Order เพื่อรอยืนยัน</p>
    </section>

    {params.error && <p className="rounded-2xl bg-red-50 p-4 font-black text-red-800">{params.error}</p>}

    <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-black text-black/50">REGRESSION TEST จากออเดอร์จริง</p><h2 className="mt-1 text-2xl font-black">ผ่าน {passed}/{regression.length} เคส</h2></div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${passed === regression.length ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>{passed === regression.length ? "พร้อมทดสอบต่อ" : "ยังต้องแก้ Parser"}</span>
      </div>
      {passed !== regression.length && <div className="mt-4 space-y-2">{regression.filter(item => !item.passed).map(item => <div key={item.name} className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">ไม่ผ่าน: {item.name}</div>)}</div>}
    </section>

    <form className="space-y-4 rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <label className="block"><span className="mb-2 block font-black">ลูกค้า</span>
        <select name="customer" defaultValue={customer?.id ?? ""} className="min-h-14 w-full rounded-2xl border-2 border-black/10 px-4 font-bold">
          <option value="">-- เลือกลูกค้า --</option>{CUSTOMER_MASTER.map(c => <option key={c.id} value={c.id}>{c.name} · กลุ่ม {c.group}</option>)}
        </select>
      </label>
      <label className="block"><span className="mb-2 block font-black">ข้อความออเดอร์จาก LINE</span>
        <textarea name="raw" defaultValue={raw} rows={8} className="w-full rounded-2xl border-2 border-black/10 p-4 text-lg font-bold" placeholder={'เช่น\nดั้งงเดิม 20 ก.ก\nทอดพริก 15 กก\nตับ 10 กก\nรอบส่ง 1 ส.ค.69'} />
      </label>
      <button className="min-h-14 rounded-2xl bg-[#E60012] px-6 text-lg font-black text-white">วิเคราะห์ข้อความ</button>
    </form>

    {result && <section className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-black">ผลการอ่าน</h2><span className={`rounded-full px-3 py-1 text-sm font-black ${result.needsReview ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"}`}>{result.needsReview ? "ต้องตรวจสอบ" : "ผ่าน Validation"}</span></div>
      <p className="mt-3 rounded-2xl bg-blue-50 p-4 font-black text-blue-900">รอบส่ง: {formatDeliveryDate(result.deliveryDateISO)}</p>
      <div className="mt-4 space-y-2">{result.items.map(item => <div key={item.product} className="flex justify-between rounded-2xl bg-black/5 p-4 text-lg font-black"><span>{item.name}</span><span>{item.kg} กก.</span></div>)}</div>
      <div className="mt-4 rounded-2xl bg-[#111] p-4 text-white"><div className="flex justify-between text-xl font-black"><span>รวม</span><span>{result.totalKg} กก.</span></div>{pricing?.pricePerKg && <div className="mt-2 flex justify-between font-bold text-white/80"><span>{pricing.pricePerKg} บาท/กก.</span><span>{pricing.total?.toLocaleString("th-TH")} บาท</span></div>}</div>
      {customer?.shippingInstruction && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-black text-red-700">ขนส่ง/จุดส่ง: {customer.shippingInstruction}</p>}
      {pricing?.warning && <p className="mt-3 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">⚠️ {pricing.warning}</p>}
      {result.errors.map((message, index) => <p key={`error-${index}`} className="mt-3 rounded-2xl bg-red-50 p-4 font-black text-red-800">⛔ {message}</p>)}
      {result.warnings.map((w, i) => <p key={i} className="mt-3 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">⚠️ {w}</p>)}
      {customer && !result.needsReview && result.deliveryDateISO && <form action={createMarinatedDraftOrder} className="mt-5 rounded-2xl border-4 border-[#FFD43B] p-4">
        <input type="hidden" name="customer_id" value={customer.id}/>
        <input type="hidden" name="raw_message" value={raw}/>
        <p className="font-black">ตรวจรายการครบแล้วใช่หรือไม่?</p>
        <p className="mt-1 text-sm font-bold text-black/55">การกดปุ่มนี้จะบันทึกเป็น Draft Order เท่านั้น ยังไม่ตัดสต๊อก ไม่บันทึก Cash Flow และไม่สร้างใบจัด–ส่งสินค้า</p>
        <button className="mt-4 min-h-14 w-full rounded-2xl bg-[#E60012] px-5 text-lg font-black text-white">บันทึกเป็น Draft Order</button>
      </form>}
      <p className="mt-4 text-sm font-bold text-black/50">ยังไม่เชื่อม LINE Automation และไม่มีผลต่อสต๊อก Cash Flow หรือโรงหมักจนกว่าจะพัฒนาขั้นเชื่อมระบบต่อไป</p>
    </section>}
  </div>;
}
