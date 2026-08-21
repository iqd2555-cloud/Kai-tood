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
  const base = Number(row.unit_cost_base ?? 0);
  if (!(base > 0)) return "ยังไม่มีราคาจากบิลที่ยืนยัน";
  if (row.base_unit === "g") return `${(base * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/กก.`;
  if (row.base_unit === "ml") return `${(base * 1000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ลิตร`;
  return `${base.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/ชิ้น`;
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
  const costPerKg = live?.is_active && Number(live.missing_cost_count ?? 0) === 0 && Number(live.cost_per_base_unit ?? 0) > 0
    ? Number(live.cost_per_base_unit) * 1000
    : null;

  return <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
    <section className="rounded-[2rem] bg-[#111] p-6 text-white shadow-xl">
      <p className="text-sm font-black text-[#FFD43B]">PHOTO BILL → CURRENT COST</p>
      <h1 className="mt-2 text-3xl font-black">ต้นทุนสินค้าแบบ Real-time</h1>
      <p className="mt-2 max-w-3xl text-white/70">ใช้ราคาล่าสุดจากรายการในใบเสร็จ ใบกำกับภาษี และใบแจ้งหนี้ที่อ่านจากรูปและผ่านการตรวจสอบเท่านั้น ข้อความพิมพ์ค่าใช้จ่ายไม่ถูกใช้เป็นราคาวัตถุดิบอัตโนมัติ</p>
    </section>

    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">ไก่หมักพร้อมทอด</div><div className="mt-2 text-2xl font-black">{costPerKg ? `${costPerKg.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท/กก.` : "รอสูตรจริง"}</div></div>
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">วัตถุดิบมีราคาปัจจุบัน</div><div className="mt-2 text-2xl font-black">{ingredients.filter((row) => Number(row.unit_cost_base ?? 0) > 0).length}/{ingredients.length} รายการ</div></div>
      <div className="rounded-3xl border bg-white p-5 shadow-sm"><div className="text-sm font-bold text-black/50">รายการจากบิลรอตรวจ</div><div className="mt-2 text-2xl font-black">{reviewCount ?? 0} รายการ</div></div>
    </section>

    {!live?.is_active && <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <h2 className="text-xl font-black">ยังไม่คำนวณต้นทุนไก่หมักจนกว่าจะใส่สูตรจริง</h2>
      <p className="mt-2 font-medium">ระบบตั้งใจไม่เดาสัดส่วน BL, BB, หนังไก่ และเครื่องปรุง เมื่อได้รับสูตรจริงจึงจะเปิด Recipe และคำนวณต้นทุนต่อกิโลจากราคาบิลล่าสุด</p>
    </section>}

    <section className="rounded-[1.75rem] border bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">ราคาวัตถุดิบล่าสุดจากรูปบิล</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {ingredients.map((row) => <article key={row.ingredient_id} className="rounded-2xl bg-black/[0.035] p-4">
          <div className="flex items-start justify-between gap-4"><div><div className="font-black">{row.name}</div><div className="mt-1 text-xl font-black">{priceLabel(row)}</div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${Number(row.unit_cost_base ?? 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>{Number(row.unit_cost_base ?? 0) > 0 ? "มีราคา" : "รอบิล"}</span></div>
          {row.source_date && <div className="mt-3 text-sm font-medium text-black/55">บิล {row.source_date}{row.merchant_name ? ` • ${row.merchant_name}` : ""}{row.confidence ? ` • ความมั่นใจ ${Math.round(Number(row.confidence) * 100)}%` : ""}</div>}
        </article>)}
      </div>
    </section>
  </main>;
}
