import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type LatestCost = {
  ingredient_id: string;
  code: string;
  name: string;
  category: string;
  base_unit: "g" | "ml" | "each";
  unit_cost_base: number | string | null;
  landed_extra_cost_per_base: number | string | null;
  effective_unit_cost_base: number | string | null;
  source_date: string | null;
  merchant_name: string | null;
  raw_name: string | null;
  normalized_quantity: number | string | null;
  normalized_unit: string | null;
  line_total: number | string | null;
  confidence: number | string | null;
};

type LiveCost = {
  recipe_code: string;
  recipe_name: string;
  output_quantity: number | string;
  output_unit: string;
  is_active: boolean;
  component_count: number | string;
  missing_cost_count: number | string;
  batch_cost: number | string | null;
  cost_per_base_unit: number | string | null;
  oldest_price_date: string | null;
  newest_price_date: string | null;
};

function priceLabel(row: LatestCost) {
  const effective = Number(row.effective_unit_cost_base ?? 0);
  if (!(effective > 0)) return "ยังไม่มีราคาจากบิลที่ยืนยัน";
  if (row.base_unit === "g") return `${(effective * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/กก.`;
  if (row.base_unit === "ml") return `${(effective * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ลิตร`;
  return `${effective.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ชิ้น`;
}

function billPriceLabel(row: LatestCost) {
  const bill = Number(row.unit_cost_base ?? 0);
  if (!(bill > 0)) return null;
  if (row.base_unit === "g") return `${(bill * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/กก.`;
  if (row.base_unit === "ml") return `${(bill * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ลิตร`;
  return `${bill.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ชิ้น`;
}

export default async function ProductCostPage() {
  const profile = await getCurrentProfile();
  if (!isOwner(profile)) redirect("/dashboard");
  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/owner-overview");

  const [{ data: ingredientRows }, { data: liveRows }, { count: reviewCount }] = await Promise.all([
    admin.from("ingredient_latest_verified_cost").select("*").order("category").order("name").returns<LatestCost[]>(),
    admin.from("product_live_cost").select("*").eq("recipe_code", "marinated_chicken_ready_to_fry").returns<LiveCost[]>(),
    admin.from("purchase_document_items").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
  ]);

  const ingredients = ingredientRows ?? [];
  const live = liveRows?.[0] ?? null;
  const missingCostCount = Number(live?.missing_cost_count ?? 0);
  const costPerKg = live?.is_active && missingCostCount === 0 && Number(live.cost_per_base_unit ?? 0) > 0
    ? Number(live.cost_per_base_unit) * 1000
    : null;
  const batchCost = costPerKg ? Number(live?.batch_cost ?? 0) : null;

  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
    <section className="rounded-[2rem] bg-[#111] p-6 text-white shadow-xl">
      <p className="text-sm font-black text-[#FFD43B]">PHOTO BILL → LANDED COST → PRODUCT COST</p>
      <h1 className="mt-2 text-3xl font-black">ต้นทุนสินค้าแบบ Real-time</h1>
      <p className="mt-2 max-w-3xl text-white/70">ราคาวัตถุดิบมาจากรายการในรูปใบเสร็จ/ใบกำกับภาษี/ใบแจ้งหนี้ที่ผ่านการตรวจสอบ สำหรับไก่สด ระบบบวกค่าขนส่งนอกบิล 2 บาท/กก. ก่อนนำไปคำนวณสูตร</p>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">ไก่หมักดั้งเดิมพร้อมทอด</div><div className="mt-2 text-2xl font-black">{costPerKg ? `${costPerKg.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/กก.` : `รอราคาจากบิล ${missingCostCount} รายการ`}</div>{batchCost ? <div className="mt-1 text-sm font-bold text-black/50">Batch 62.65 กก. = {batchCost.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท</div> : null}</div>
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">วัตถุดิบมีราคาปัจจุบัน</div><div className="mt-2 text-2xl font-black">{ingredients.filter((row) => Number(row.effective_unit_cost_base ?? 0) > 0).length}/{ingredients.length} รายการ</div></div>
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">รายการจากบิลรอตรวจ</div><div className="mt-2 text-2xl font-black">{reviewCount ?? 0} รายการ</div></div>
    </section>

    {live?.is_active && <section className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-950">
      <h2 className="text-xl font-black">สูตรไก่ดั้งเดิมเปิดใช้งานแล้ว</h2>
      <p className="mt-2 font-medium">Batch มาตรฐาน: ไก่สด 50 กก. = BL 20 + BB 10 + หนัง 20 กก. ใช้เครื่องปรุงตามสูตร และ Yield ไก่หมัก 62.65 กก. ระบบจะคำนวณใหม่อัตโนมัติเมื่อบิลวัตถุดิบล่าสุดเปลี่ยน</p>
    </section>}

    <section className="rounded-[1.75rem] border bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">ราคาวัตถุดิบล่าสุดจากรูปบิล</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ingredients.map((row) => {
          const hasCost = Number(row.effective_unit_cost_base ?? 0) > 0;
          const landedExtra = Number(row.landed_extra_cost_per_base ?? 0);
          const billPrice = billPriceLabel(row);
          return <article key={row.ingredient_id} className="rounded-2xl bg-black/[0.035] p-4">
            <div className="flex items-start justify-between gap-4"><div><div className="font-black">{row.name}</div><div className="mt-1 text-xl font-black">{priceLabel(row)}</div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${hasCost ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>{hasCost ? "มีราคา" : "รอบิล"}</span></div>
            {billPrice && landedExtra > 0 && <div className="mt-2 text-sm font-bold text-blue-800">ราคาบิล {billPrice} + ขนส่ง 2 บาท/กก. = ราคาต้นทุนถึงโรงหมัก</div>}
            {row.source_date && <div className="mt-3 text-sm font-medium text-black/55">บิล {row.source_date}{row.merchant_name ? ` • ${row.merchant_name}` : ""}{row.confidence ? ` • ความมั่นใจ ${Math.round(Number(row.confidence) * 100)}%` : ""}</div>}
          </article>;
        })}
      </div>
    </section>
  </main>;
}
