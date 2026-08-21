import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type LiveCost = {
  is_active: boolean;
  missing_cost_count: number | string;
  fallback_component_count: number | string;
  batch_cost: number | string | null;
  cost_per_base_unit: number | string | null;
  oldest_price_date: string | null;
  newest_price_date: string | null;
};

export default async function CeoTodayLayout({ children }: { children: React.ReactNode }) {
  const admin = createSupabaseAdminClient();
  const { data } = admin
    ? await admin
        .from("product_live_cost")
        .select("is_active,missing_cost_count,fallback_component_count,batch_cost,cost_per_base_unit,oldest_price_date,newest_price_date")
        .eq("recipe_code", "marinated_chicken_ready_to_fry")
        .maybeSingle<LiveCost>()
    : { data: null };

  const ready = Boolean(data?.is_active) && Number(data?.missing_cost_count ?? 0) === 0 && Number(data?.cost_per_base_unit ?? 0) > 0;
  const costPerKg = ready ? Number(data?.cost_per_base_unit) * 1000 : null;
  const fallbackCount = Number(data?.fallback_component_count ?? 0);
  const sourceLabel = ready
    ? fallbackCount > 0
      ? `ใช้ราคาล่าสุดที่ยืนยัน ${fallbackCount} รายการ • จะอัปเดตอัตโนมัติเมื่อบิลใหม่ผ่านตรวจสอบ`
      : "ใช้ราคาจากบิลล่าสุดที่ผ่านตรวจสอบครบทุกวัตถุดิบ"
    : "ยังไม่มีราคาที่ใช้คำนวณได้ครบ";

  return (
    <>
      <div className="mx-auto mb-4 w-full max-w-5xl px-0">
        <Link href="/product-cost" className="block rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition hover:bg-amber-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">ต้นทุนไก่หมักดั้งเดิม</p>
              <p className="mt-1 text-3xl font-black text-black">
                {costPerKg === null ? "รอข้อมูล" : `${costPerKg.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท/กก.`}
              </p>
              <p className="mt-1 text-xs font-semibold text-black/55">{sourceLabel}</p>
            </div>
            <div className="text-right">
              {ready && data?.batch_cost ? <p className="text-sm font-black">Batch 50 กก. = {Number(data.batch_cost).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</p> : null}
              <p className="mt-1 text-xs font-bold text-black/45">แตะเพื่อดูรายละเอียดต้นทุน</p>
            </div>
          </div>
        </Link>
      </div>
      {children}
    </>
  );
}
