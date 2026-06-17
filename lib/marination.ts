export type MarinationMovementType = "received" | "used" | "counted" | "adjustment";

export type ChickenPart = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
  created_at?: string;
};

export type MarinationStockMovement = {
  id: string;
  movement_date: string;
  chicken_part_id: string;
  movement_type: MarinationMovementType;
  quantity_kg: number;
  note: string | null;
  created_by: string;
  created_at: string;
  updated_at?: string | null;
};

export type MarinationPartSummary = {
  part: ChickenPart;
  received: number;
  used: number;
  adjustment: number;
  systemBalance: number;
  latestCounted: number | null;
  variance: number | null;
  latestNote: string;
  latestMovementAt: string | null;
  latestRecorder: string;
};

export type MarinationTotals = {
  received: number;
  used: number;
  systemBalance: number;
  latestCounted: number;
  variance: number;
};

export const movementTypeLabels: Record<MarinationMovementType, string> = {
  received: "รับเข้า",
  used: "ใช้หมัก",
  counted: "ตรวจนับจริง",
  adjustment: "ปรับยอด",
};

export function buildMarinationSummaries(parts: ChickenPart[], movements: MarinationStockMovement[]) {
  const summaries = parts.map<MarinationPartSummary>((part) => {
    const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id);
    const received = sumByType(partMovements, "received");
    const used = sumByType(partMovements, "used");
    const adjustment = sumByType(partMovements, "adjustment");
    const systemBalance = received + adjustment - used;
    const latestCount = partMovements.find((movement) => movement.movement_type === "counted");
    const latestWithNote = partMovements.find((movement) => movement.note?.trim());
    const latestMovement = partMovements[0];
    const latestCounted = latestCount ? Number(latestCount.quantity_kg) : null;

    return {
      part,
      received,
      used,
      adjustment,
      systemBalance,
      latestCounted,
      variance: latestCounted === null ? null : latestCounted - systemBalance,
      latestNote: latestWithNote?.note?.trim() ?? "-",
      latestMovementAt: latestMovement?.created_at ?? null,
      latestRecorder: latestMovement?.created_by ?? "-",
    };
  });

  const totals = summaries.reduce<MarinationTotals>((total, row) => {
    total.received += row.received;
    total.used += row.used;
    total.systemBalance += row.systemBalance;
    total.latestCounted += row.latestCounted ?? 0;
    total.variance += row.variance ?? 0;
    return total;
  }, { received: 0, used: 0, systemBalance: 0, latestCounted: 0, variance: 0 });

  return { summaries, totals };
}

function sumByType(movements: MarinationStockMovement[], type: MarinationMovementType) {
  return movements
    .filter((movement) => movement.movement_type === type)
    .reduce((sum, movement) => sum + Number(movement.quantity_kg), 0);
}
