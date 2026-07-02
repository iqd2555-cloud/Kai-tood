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

export type LedgerMovement = Pick<MarinationStockMovement, "movement_date" | "movement_type" | "quantity_kg"> &
  Partial<Pick<MarinationStockMovement, "id" | "created_at" | "note">>;

export type LedgerReplayRow = {
  id: string;
  movementDate: string;
  createdAt: string | null;
  movementType: string;
  quantityKg: number;
  balanceBefore: number;
  signedEffect: number;
  balanceAfter: number;
  reason: string;
  note?: string | null;
};

export type LedgerReplayResult = {
  openingKg: number;
  receivedKg: number;
  usedKg: number;
  adjustmentDeltaKg: number;
  systemRemainingKg: number;
  rowsBeforeDate: LedgerReplayRow[];
  rowsOnDate: LedgerReplayRow[];
  ignoredRows: LedgerReplayRow[];
  warnings: string[];
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
  // system closing balance from the previous business day. Rebuild it by
  // replaying every movement in business-date order: received = +kg, used =
  // -kg, adjustment = set system balance to the target kg, counted = display
  // only. This keeps target-balance adjustments from being counted as an
  // additional positive movement.
  const summaries = parts.map<MarinationPartSummary>((part) => {
    const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id);
    const selectedDateMovements = partMovements.filter((movement) => movement.movement_date === selectedDate);
    const replay = replayMarinationLedgerForDate(partMovements, selectedDate);
    const opening = replay.openingKg;
    const received = replay.receivedKg;
    const used = replay.usedKg;
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

export function replayMarinationLedgerForDate(movements: LedgerMovement[], selectedDate: string): LedgerReplayResult {
  let balance = 0;
  const rowsBeforeDate: LedgerReplayRow[] = [];
  const rowsOnDate: LedgerReplayRow[] = [];
  const ignoredRows: LedgerReplayRow[] = [];
  const warnings: string[] = [];

  for (const movement of sortMarinationLedgerMovements(movements)) {
    const movementType = movement.movement_type;
    const quantityKg = Number(movement.quantity_kg) || 0;
    const balanceBefore = balance;
    let signedEffect = 0;
    let reason = "ตรวจนับจริงใช้แสดงผลเท่านั้น ไม่กระทบยอดระบบ";
    const isLedgerMovement = movementType === "received" || movementType === "used" || movementType === "adjustment";

    if (movementType === "received") {
      signedEffect = quantityKg;
      balance += signedEffect;
      reason = "รับเข้า นับเป็นบวก";
    } else if (movementType === "used") {
      signedEffect = -quantityKg;
      balance += signedEffect;
      reason = "ใช้หมัก นับเป็นลบ";
    } else if (movementType === "adjustment") {
      balance = quantityKg;
      signedEffect = balance - balanceBefore;
      reason = "ปรับยอดแบบตั้งยอดใหม่ ผลต่อสต๊อกคือ target ลบยอดก่อนหน้า";
    } else if (movementType !== "counted") {
      warnings.push(`พบ movement_type ที่ไม่รู้จัก: ${movementType || "(ว่าง)"} ในรายการ ${movement.id ?? "ไม่มี id"}`);
      reason = "movement_type ไม่รู้จัก จึงไม่นำมาคิด";
    }

    const row: LedgerReplayRow = {
      id: movement.id ?? `${movement.movement_date}-${movementType}-${rowsBeforeDate.length + rowsOnDate.length + ignoredRows.length}`,
      movementDate: movement.movement_date,
      createdAt: movement.created_at ?? null,
      movementType,
      quantityKg,
      balanceBefore,
      signedEffect: isLedgerMovement ? signedEffect : 0,
      balanceAfter: isLedgerMovement ? balance : balanceBefore,
      reason,
      note: movement.note ?? null,
    };

    if (movement.movement_date < selectedDate && isLedgerMovement) rowsBeforeDate.push(row);
    else if (movement.movement_date === selectedDate && isLedgerMovement) rowsOnDate.push(row);
    else ignoredRows.push(row);
  }

  const openingKg = rowsBeforeDate.length > 0 ? rowsBeforeDate[rowsBeforeDate.length - 1].balanceAfter : 0;
  const receivedKg = rowsOnDate.filter((row) => row.movementType === "received").reduce((sum, row) => sum + row.quantityKg, 0);
  const usedKg = rowsOnDate.filter((row) => row.movementType === "used").reduce((sum, row) => sum + row.quantityKg, 0);
  const systemRemainingKg = rowsOnDate.length > 0 ? rowsOnDate[rowsOnDate.length - 1].balanceAfter : openingKg;
  const adjustmentDeltaKg = systemRemainingKg - openingKg - receivedKg + usedKg;

  return { openingKg, receivedKg, usedKg, adjustmentDeltaKg, systemRemainingKg, rowsBeforeDate, rowsOnDate, ignoredRows, warnings: Array.from(new Set(warnings)) };
}

export function calculateMarinationOpeningBalance(movements: LedgerMovement[]) {
  return replayMarinationLedger(movements).balance;
}

export function calculateMarinationClosingBalanceOnDate(movements: LedgerMovement[], closingDate: string) {
  return calculateMarinationOpeningBalance(movements.filter((movement) => movement.movement_date <= closingDate));
}

export function calculateMarinationSystemBalance(movements: LedgerMovement[]) {
  return replayMarinationLedger(movements).balance;
}

export function replayMarinationLedger(movements: LedgerMovement[], initialBalance = 0) {
  return sortMarinationLedgerMovements(movements).reduce((state, movement) => {
    const previousBalance = state.balance;
    const quantity = Number(movement.quantity_kg) || 0;

    if (movement.movement_type === "received") state.balance += quantity;
    if (movement.movement_type === "used") state.balance -= quantity;
    if (movement.movement_type === "adjustment") state.balance = quantity;

    if (movement.movement_type === "adjustment") state.adjustmentEffectKg += state.balance - previousBalance;
    return state;
  }, { balance: initialBalance, adjustmentEffectKg: 0 });
}

export function sortMarinationLedgerMovements<T extends LedgerMovement>(movements: T[]) {
  return movements.slice().sort((a, b) =>
    a.movement_date.localeCompare(b.movement_date) ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
    (a.id ?? "").localeCompare(b.id ?? "")
  );
}
