import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { todayISO } from "@/lib/format";
import { MarinationConsole } from "./marination-console";
import type { ChickenPart, MarinationStockMovement } from "@/lib/marination";
import { canAccessMarinationByEmail, canManageMarinationMovements } from "@/lib/marination-access";

type Props = { searchParams?: Promise<{ date?: string }> };

function normalizeDate(value: string | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}$/) ? value : todayISO();
}

export default async function MarinationPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authEmail = user?.email ?? null;
  const canAccessMarination = canAccessMarinationByEmail(authEmail ?? profile.email);
  const canManageMovements = canManageMarinationMovements(profile);

  if (!canAccessMarination) {
    return (
      <section className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-black text-black/50">ระบบโรงหมักไก่</p>
        <h1 className="mt-2 text-2xl font-black">คุณไม่มีสิทธิ์เข้าใช้งานระบบโรงหมักไก่</h1>
        <p className="mt-2 font-bold text-black/60">กรุณาติดต่อเจ้าของร้าน หากต้องการเพิ่มสิทธิ์เข้าใช้งาน</p>
      </section>
    );
  }

  const params = searchParams ? await searchParams : {};
  const selectedDate = normalizeDate(params.date);

  const [{ data: partsData, error: partsError }, { data: movementsData, error: movementsError }] = await Promise.all([
    supabase
      .from("chicken_parts")
      .select("id, name, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .returns<ChickenPart[]>(),
    supabase
      .from("marination_stock_movements")
      .select("id, movement_date, chicken_part_id, movement_type, quantity_kg, note, created_by, created_at, updated_at, is_voided, voided_at, voided_by, void_reason")
      .eq("is_voided", false)
      .lte("movement_date", selectedDate)
      .order("movement_date", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<MarinationStockMovement[]>(),
  ]);

  if (partsError || movementsError) {
    return (
      <section className="rounded-[2rem] bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black">ยังเปิดระบบโรงหมักไก่ไม่ได้</h1>
        <p className="mt-2 font-bold text-black/60">กรุณารัน migration Supabase สำหรับตาราง chicken_parts และ marination_stock_movements ก่อนใช้งาน</p>
        <pre className="mt-4 overflow-auto rounded-2xl bg-black p-4 text-xs text-white">{partsError?.message ?? movementsError?.message}</pre>
      </section>
    );
  }

  return (
    <MarinationConsole
      parts={partsData ?? []}
      initialMovements={movementsData ?? []}
      userId={profile.id}
      selectedDate={selectedDate}
      canViewAudit={canManageMovements}
      canAdjustMovements={canManageMovements}
      canVoidMovements={canManageMovements}
    />
  );
}
