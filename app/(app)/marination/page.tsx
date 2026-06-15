import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { todayISO } from "@/lib/format";
import { MarinationConsole } from "./marination-console";
import type { ChickenPart, MarinationStockMovement } from "@/lib/marination";

type Props = { searchParams?: Promise<{ date?: string }> };

function normalizeDate(value: string | undefined) {
  return value?.match(/^\d{4}-\d{2}-\d{2}$/) ? value : todayISO();
}

export default async function MarinationPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?setup=supabase");
  const params = searchParams ? await searchParams : {};
  const selectedDate = normalizeDate(params.date);

  const [{ data: partsData, error: partsError }, { data: movementsData, error: movementsError }] = await Promise.all([
    supabase.from("chicken_parts").select("*").eq("is_active", true).order("sort_order", { ascending: true }).returns<ChickenPart[]>(),
    supabase
      .from("marination_stock_movements")
      .select(`*, chicken_part:chicken_parts!marination_stock_movements_chicken_part_id_fkey(id, name, sort_order), profiles(full_name, role)`)
      .eq("movement_date", selectedDate)
      .order("created_at", { ascending: false })
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
      isOwner={isOwner(profile)}
      selectedDate={selectedDate}
    />
  );
}
