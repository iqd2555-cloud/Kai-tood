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

export type MarinationPartStockSummary = {
  partId: string;
  partName: string;
  date: string;
  openingKg: number;
  receivedKg: number;
  usedKg: number;
  adjustmentKg: number;
  systemRemainingKg: number;
  latestPhysicalCountKg: number | null;
  varianceKg: number | null;
  latestNote: string | null;
};

export type MarinationPartSummary = Omit<MarinationPartStockSummary, "latestNote"> & {
  part: ChickenPart;
  received: number;
  used: number;
  adjustment: number;
  systemBalance: number;
  latestCounted: number | null;
  variance: number | null;
  latestNote: string | null;
  latestMovementAt: string | null;
  latestRecorder: string;
};

export type MarinationTotals = {
  opening: number;
  received: number;
  used: number;
  adjustment: number;
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

export function buildMarinationSummaries(parts: ChickenPart[], movements: MarinationStockMovement[], selectedDate: string) {
  // Daily closed-ledger rule: opening balance for the selected date is the
  // system closing balance from the latest stock day before the selected date.
  // That closing balance is rebuilt from system-affecting movements only:
  // received = +kg, used = -kg, adjustment = signed delta, counted = display
  // only. This prevents positive-only history (or physical counts) from being
  // treated as today's opening balance.
  const summaries = parts.map<MarinationPartSummary>((part) => {
    const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id);
    const previousMovements = partMovements.filter((movement) => movement.movement_date < selectedDate);
    const selectedDateMovements = partMovements.filter((movement) => movement.movement_date === selectedDate);
    const opening = calculateMarinationOpeningBalance(previousMovements);
    const received = sumByType(selectedDateMovements, "received");
    const used = sumByType(selectedDateMovements, "used");
    const adjustment = sumByType(selectedDateMovements, "adjustment");
    const systemBalance = opening + received + adjustment - used;
    const latestCount = selectedDateMovements.find((movement) => movement.movement_type === "counted");
    const latestWithNote = selectedDateMovements.find((movement) => movement.note?.trim());
    const latestMovement = selectedDateMovements[0];
    const latestCounted = latestCount ? Number(latestCount.quantity_kg) : null;
    const latestNoteValue = latestWithNote?.note?.trim() ?? null;

    return {
      part,
      partId: part.id,
      partName: part.name,
      date: selectedDate,
      openingKg: opening,
      receivedKg: received,
      usedKg: used,
      adjustmentKg: adjustment,
      systemRemainingKg: systemBalance,
      latestPhysicalCountKg: latestCounted,
      varianceKg: latestCounted === null ? null : latestCounted - systemBalance,
      latestNote: latestNoteValue,
      latestMovementAt: latestMovement?.created_at ?? null,
      latestRecorder: latestMovement?.created_by ?? "-",
      received,
      used,
      adjustment,
      systemBalance,
      latestCounted,
      variance: latestCounted === null ? null : latestCounted - systemBalance,
    };
  });

  const totals = summaries.reduce<MarinationTotals>((total, row) => {
    total.opening += row.openingKg;
    total.received += row.received;
    total.used += row.used;
    total.adjustment += row.adjustment;
    total.systemBalance += row.systemBalance;
    total.latestCounted += row.latestCounted ?? 0;
    total.variance += row.variance ?? 0;
    return total;
  }, { opening: 0, received: 0, used: 0, adjustment: 0, systemBalance: 0, latestCounted: 0, variance: 0 });

  return { summaries, totals };
}

export function calculateMarinationOpeningBalance(movements: Pick<MarinationStockMovement, "movement_date" | "movement_type" | "quantity_kg">[]) {
  const movementsByDate = new Map<string, Pick<MarinationStockMovement, "movement_type" | "quantity_kg">[]>();

  for (const movement of movements) {
    const dateMovements = movementsByDate.get(movement.movement_date) ?? [];
    dateMovements.push(movement);
    movementsByDate.set(movement.movement_date, dateMovements);
  }

  return Array.from(movementsByDate.keys()).sort().reduce((closingBalance, date) => {
    return closingBalance + calculateMarinationSystemBalance(movementsByDate.get(date) ?? []);
  }, 0);
}

export function calculateMarinationSystemBalance(movements: Pick<MarinationStockMovement, "movement_type" | "quantity_kg">[]) {
  return movements.reduce((balance, movement) => {
    return balance + getMarinationMovementDelta(movement);
  }, 0);
}

function getMarinationMovementDelta(movement: Pick<MarinationStockMovement, "movement_type" | "quantity_kg">) {
  const quantity = Number(movement.quantity_kg);
  if (movement.movement_type === "received" || movement.movement_type === "adjustment") return quantity;
  if (movement.movement_type === "used") return -quantity;
  return 0;
}

function sumByType(movements: MarinationStockMovement[], type: MarinationMovementType) {
  return movements
    .filter((movement) => movement.movement_type === type)
    .reduce((sum, movement) => sum + Number(movement.quantity_kg), 0);
}
