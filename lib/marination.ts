import { numberFormatter } from "./format.ts";
import { replayMarinationLedger, replayMarinationLedgerForDate, sortMarinationLedgerMovements, type RawMarinationLedgerMovement, type ReplayRow } from "./marination/replay-ledger.ts";

export type MarinationMovementType = "received" | "used" | "fresh_sale" | "counted" | "adjustment";

export type ChickenPart = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
  created_at?: string;
};

export type MarinationStockReset = {
  id: string;
  reset_date: string;
  branch_id: string | null;
  note: string | null;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
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
  is_voided?: boolean | null;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
};

export type LedgerMovement = RawMarinationLedgerMovement;
export type LedgerReplayRow = ReplayRow;
export type LedgerReplayResult = ReturnType<typeof replayMarinationLedgerForDate>;

export type MarinationPartStockSummary = {
  partId: string;
  partName: string;
  date: string;
  openingKg: number;
  receivedKg: number;
  usedKg: number;
  soldFreshKg: number;
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
  soldFresh: number;
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
  soldFresh: number;
  adjustment: number;
  systemBalance: number;
  latestCounted: number;
  variance: number;
};

export const movementTypeLabels: Record<MarinationMovementType, string> = {
  received: "รับเข้า",
  used: "ใช้หมัก",
  fresh_sale: "ขายไก่สด",
  counted: "ตรวจนับจริง",
  adjustment: "ปรับยอด",
};

export function buildAdjustmentNoteForMarination(userNote: string, targetBalance: number, currentSystemBalance: number) {
  const autoNote = `ปรับยอดให้คงเหลือเป็น ${numberFormatter.format(targetBalance)} กก. จากยอดเดิม ${numberFormatter.format(currentSystemBalance)} กก.`;
  const trimmedNote = userNote.trim();
  return trimmedNote ? `${trimmedNote} | ${autoNote}` : autoNote;
}

export function buildMarinationSummaries(parts: ChickenPart[], movements: MarinationStockMovement[], selectedDate: string, stockResetDate: string | null = null) {
  // Daily closed-ledger rule: opening balance for the selected date is the
  // system closing balance from the previous business day. Receive adds stock;
  // use and fresh-sale reduce stock; adjustment sets the authoritative closing
  // balance; counted is display-only.
  const summaries = parts.map<MarinationPartSummary>((part) => {
    const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id);
    const selectedDateMovements = partMovements.filter((movement) => movement.movement_date === selectedDate);
    const replay = replayMarinationLedgerForDate(partMovements, selectedDate, part.id, stockResetDate);
    const opening = replay.openingKg;
    const received = replay.receivedKg;
    const used = replay.usedKg;
    const soldFresh = replay.soldFreshKg;
    const systemBalance = replay.systemRemainingKg;
    const adjustment = replay.adjustmentDeltaKg;
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
      soldFreshKg: soldFresh,
      adjustmentKg: adjustment,
      systemRemainingKg: systemBalance,
      latestPhysicalCountKg: latestCounted,
      varianceKg: latestCounted === null ? null : latestCounted - systemBalance,
      latestNote: latestNoteValue,
      latestMovementAt: latestMovement?.created_at ?? null,
      latestRecorder: latestMovement?.created_by ?? "-",
      received,
      used,
      soldFresh,
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
    total.soldFresh += row.soldFresh;
    total.adjustment += row.adjustment;
    total.systemBalance += row.systemBalance;
    total.latestCounted += row.latestCounted ?? 0;
    total.variance += row.variance ?? 0;
    return total;
  }, { opening: 0, received: 0, used: 0, soldFresh: 0, adjustment: 0, systemBalance: 0, latestCounted: 0, variance: 0 });

  return { summaries, totals };
}

export { replayMarinationLedgerForDate, replayMarinationLedger, sortMarinationLedgerMovements };

export function calculateMarinationOpeningBalance(movements: LedgerMovement[], stockResetDate: string | null = null) {
  return replayMarinationLedger(movements, 0, stockResetDate).balance;
}

export function calculateMarinationClosingBalanceOnDate(movements: LedgerMovement[], closingDate: string, stockResetDate: string | null = null) {
  return calculateMarinationOpeningBalance(movements.filter((movement) => String(movement.movement_date ?? movement.movementDate ?? "") <= closingDate), stockResetDate && stockResetDate <= closingDate ? stockResetDate : null);
}

export function calculateMarinationSystemBalance(movements: LedgerMovement[], stockResetDate: string | null = null) {
  return replayMarinationLedger(movements, 0, stockResetDate).balance;
}

export function calculateMarinationAverageDailyOutflow(
  movements: MarinationStockMovement[],
  fromDate: string,
  toDate: string,
) {
  const outflowByDate = new Map<string, number>();

  for (const movement of movements) {
    if (
      movement.is_voided ||
      movement.movement_date < fromDate ||
      movement.movement_date > toDate ||
      !["used", "fresh_sale"].includes(movement.movement_type)
    ) continue;

    outflowByDate.set(
      movement.movement_date,
      (outflowByDate.get(movement.movement_date) ?? 0) + Number(movement.quantity_kg ?? 0),
    );
  }

  const activeDays = [...outflowByDate.values()].filter((quantityKg) => quantityKg > 0);
  return activeDays.length
    ? activeDays.reduce((total, quantityKg) => total + quantityKg, 0) / activeDays.length
    : 0;
}

export type MarinationStockCoverageStatus = "normal" | "prepare" | "urgent" | "critical" | "unknown";

export function calculateMarinationStockCoverage(stockKg: number, averageDailyOutflowKg: number) {
  if (averageDailyOutflowKg <= 0) {
    return { days: null, label: "รอข้อมูลการใช้", status: "unknown" as MarinationStockCoverageStatus };
  }

  const days = Math.max(0, stockKg) / averageDailyOutflowKg;
  if (days < 1) return { days, label: "วิกฤต — ต้องสั่งทันที", status: "critical" as MarinationStockCoverageStatus };
  if (days < 3) return { days, label: "ต้องเร่งสั่งซื้อ", status: "urgent" as MarinationStockCoverageStatus };
  if (days <= 5) return { days, label: "ควรเตรียมสั่งซื้อ", status: "prepare" as MarinationStockCoverageStatus };
  return { days, label: "สต๊อกเพียงพอ", status: "normal" as MarinationStockCoverageStatus };
}
