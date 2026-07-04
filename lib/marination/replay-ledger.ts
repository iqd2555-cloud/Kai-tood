export type NormalizedMovementKind = "receive" | "use" | "set_balance" | "stock_check" | "unknown";

export type MarinationLedgerMovement = {
  id: string;
  partId: string;
  movementDate: string;
  createdAt: string;
  movementType: string;
  quantityKg: number;
  note?: string | null;
  isVoided?: boolean;
};

export type ReplayBucket = "before_selected_date" | "on_selected_date" | "ignored";

export type ReplayRow = {
  id: string;
  movementDate: string;
  createdAt: string;
  movementType: string;
  normalizedKind: NormalizedMovementKind;
  quantityKg: number;
  balanceBefore: number;
  signedEffect: number;
  balanceAfter: number;
  bucket: ReplayBucket;
  reason: string;
  note?: string | null;
};

export type ReplayResult = {
  selectedDate: string;
  stockResetDate: string | null;
  partId: string;
  openingKg: number;
  receivedKg: number;
  usedKg: number;
  adjustmentDeltaKg: number;
  systemRemainingKg: number;
  rowsBeforeSelectedDate: ReplayRow[];
  rowsOnSelectedDate: ReplayRow[];
  ignoredRows: ReplayRow[];
  warnings: string[];
};

export type RawMarinationLedgerMovement = {
  id?: string | null;
  chicken_part_id?: string | null;
  partId?: string | null;
  movement_date?: string | null;
  movementDate?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  movement_type?: string | null;
  movementType?: string | null;
  quantity_kg?: number | string | null;
  quantityKg?: number | string | null;
  note?: string | null;
  is_voided?: boolean | null;
  isVoided?: boolean | null;
};

export function replayMarinationLedgerForDate(movements: RawMarinationLedgerMovement[], selectedDate: string, partId?: string, stockResetDate: string | null = null): ReplayResult {
  let balance = 0;
  const rowsBeforeSelectedDate: ReplayRow[] = [];
  const rowsOnSelectedDate: ReplayRow[] = [];
  const ignoredRows: ReplayRow[] = [];
  const warnings: string[] = [];
  const normalizedMovements = sortMarinationLedgerMovements(movements.map(normalizeMovement).filter((movement) => !movement.isVoided));
  const effectiveResetDate = stockResetDate && stockResetDate <= selectedDate ? stockResetDate : null;
  const effectiveSetBalanceMovements = getEffectiveDailySetBalanceMovements(normalizedMovements);
  const replayPartId = partId ?? normalizedMovements.find((movement) => movement.partId)?.partId ?? "";

  for (const movement of normalizedMovements) {
    const normalizedKind = normalizeMovementKind(movement.movementType);
    const quantityKg = Number(movement.quantityKg) || 0;
    const balanceBefore = balance;
    let signedEffect = 0;
    let balanceAfter = balanceBefore;
    let reason = "ตรวจนับจริงใช้แสดงผลเท่านั้น ไม่กระทบยอดระบบ";
    const isSupersededSetBalance = normalizedKind === "set_balance" && !effectiveSetBalanceMovements.has(movement);
    const isBeforeActiveReset = Boolean(effectiveResetDate && movement.movementDate < effectiveResetDate);
    const bucket = isSupersededSetBalance || isBeforeActiveReset ? "ignored" : getBucket(movement.movementDate, selectedDate, normalizedKind);

    if (isBeforeActiveReset) {
      reason = `รายการก่อน Stock Reset Date (${effectiveResetDate}) จึงไม่ถูกนำมาคำนวณยอดปัจจุบัน`;
    } else if (isSupersededSetBalance) {
      reason = "ปรับยอดถูกแทนที่ด้วยรายการปรับยอดล่าสุดของวันเดียวกัน";
    } else if (normalizedKind === "receive") {
      signedEffect = quantityKg;
      balance += signedEffect;
      balanceAfter = balance;
      reason = "รับเข้า นับเป็นบวก";
    } else if (normalizedKind === "use") {
      signedEffect = -quantityKg;
      balance += signedEffect;
      balanceAfter = balance;
      reason = "ใช้หมัก นับเป็นลบ";
    } else if (normalizedKind === "set_balance") {
      balance = quantityKg;
      signedEffect = balance - balanceBefore;
      balanceAfter = balance;
      reason = "ปรับยอดแบบตั้งยอดใหม่ ผลต่อสต๊อกคือ target ลบยอดก่อนหน้า";
    } else if (normalizedKind === "unknown") {
      warnings.push(`พบ movement_type ที่ไม่รู้จัก: ${movement.movementType || "(ว่าง)"} ในรายการ ${movement.id || "ไม่มี id"}`);
      reason = "movement_type ไม่รู้จัก จึงไม่นำมาคิด";
    }

    const row: ReplayRow = {
      id: movement.id || `${movement.movementDate}-${movement.movementType}-${rowsBeforeSelectedDate.length + rowsOnSelectedDate.length + ignoredRows.length}`,
      movementDate: movement.movementDate,
      createdAt: movement.createdAt,
      movementType: movement.movementType,
      normalizedKind,
      quantityKg,
      balanceBefore,
      signedEffect: isSystemLedgerKind(normalizedKind) && !isSupersededSetBalance ? signedEffect : 0,
      balanceAfter: isSystemLedgerKind(normalizedKind) && !isSupersededSetBalance ? balanceAfter : balanceBefore,
      bucket,
      reason,
      note: movement.note ?? null,
    };

    if (bucket === "before_selected_date") rowsBeforeSelectedDate.push(row);
    else if (bucket === "on_selected_date") rowsOnSelectedDate.push(row);
    else ignoredRows.push(row);
  }

  const openingKg = rowsBeforeSelectedDate.length > 0 ? rowsBeforeSelectedDate[rowsBeforeSelectedDate.length - 1].balanceAfter : 0;
  const receivedKg = rowsOnSelectedDate.filter((row) => row.normalizedKind === "receive").reduce((sum, row) => sum + row.quantityKg, 0);
  const usedKg = rowsOnSelectedDate.filter((row) => row.normalizedKind === "use").reduce((sum, row) => sum + row.quantityKg, 0);
  const systemRemainingKg = rowsOnSelectedDate.length > 0 ? rowsOnSelectedDate[rowsOnSelectedDate.length - 1].balanceAfter : openingKg;
  const adjustmentDeltaKg = systemRemainingKg - openingKg - receivedKg + usedKg;

  return { selectedDate, stockResetDate: effectiveResetDate, partId: replayPartId, openingKg, receivedKg, usedKg, adjustmentDeltaKg, systemRemainingKg, rowsBeforeSelectedDate, rowsOnSelectedDate, ignoredRows, warnings: Array.from(new Set(warnings)) };
}

export function replayMarinationLedger(movements: RawMarinationLedgerMovement[], initialBalance = 0, stockResetDate: string | null = null) {
  const normalizedMovements = sortMarinationLedgerMovements(movements.map(normalizeMovement).filter((movement) => !movement.isVoided && (!stockResetDate || String(movement.movementDate ?? "") >= stockResetDate)));
  const effectiveSetBalanceMovements = getEffectiveDailySetBalanceMovements(normalizedMovements);
  return normalizedMovements.reduce((state, movement) => {
    const previousBalance = state.balance;
    const quantity = Number(movement.quantityKg) || 0;
    const kind = normalizeMovementKind(movement.movementType);
    if (kind === "receive") state.balance += quantity;
    if (kind === "use") state.balance -= quantity;
    if (kind === "set_balance" && effectiveSetBalanceMovements.has(movement)) state.balance = quantity;
    if (kind === "set_balance" && effectiveSetBalanceMovements.has(movement)) state.adjustmentEffectKg += state.balance - previousBalance;
    return state;
  }, { balance: initialBalance, adjustmentEffectKg: 0 });
}

export function sortMarinationLedgerMovements<T extends RawMarinationLedgerMovement | MarinationLedgerMovement>(movements: T[]) {
  return movements.slice().sort((a, b) =>
    getMovementDate(a).localeCompare(getMovementDate(b)) ||
    getMovementKindSortOrder(a) - getMovementKindSortOrder(b) ||
    getCreatedAt(a).localeCompare(getCreatedAt(b)) ||
    getId(a).localeCompare(getId(b))
  );
}

export function normalizeMovementKind(movementType: string | null | undefined): NormalizedMovementKind {
  const normalized = (movementType ?? "").trim().toLowerCase();
  if (["received", "receive", "in"].includes(normalized)) return "receive";
  if (["used", "use", "out"].includes(normalized)) return "use";
  if (["adjustment", "set_balance", "set-balance"].includes(normalized)) return "set_balance";
  if (["counted", "stock_check", "stock-check"].includes(normalized)) return "stock_check";
  return "unknown";
}

function normalizeMovement(movement: RawMarinationLedgerMovement): MarinationLedgerMovement {
  return {
    id: String(movement.id ?? ""),
    partId: String(movement.partId ?? movement.chicken_part_id ?? ""),
    movementDate: String(movement.movementDate ?? movement.movement_date ?? ""),
    createdAt: String(movement.createdAt ?? movement.created_at ?? ""),
    movementType: String(movement.movementType ?? movement.movement_type ?? ""),
    quantityKg: Number(movement.quantityKg ?? movement.quantity_kg) || 0,
    note: movement.note ?? null,
    isVoided: Boolean(movement.isVoided ?? movement.is_voided),
  };
}

function getEffectiveDailySetBalanceMovements(movements: MarinationLedgerMovement[]) {
  const latestByPartAndDate = new Map<string, MarinationLedgerMovement>();

  for (const movement of movements) {
    if (normalizeMovementKind(movement.movementType) !== "set_balance") continue;

    const key = `${movement.partId}::${movement.movementDate}`;
    const current = latestByPartAndDate.get(key);
    if (!current || compareSetBalanceRecency(movement, current) > 0) {
      latestByPartAndDate.set(key, movement);
    }
  }

  return new Set(latestByPartAndDate.values());
}

function compareSetBalanceRecency(a: MarinationLedgerMovement, b: MarinationLedgerMovement) {
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function getBucket(movementDate: string, selectedDate: string, kind: NormalizedMovementKind): ReplayBucket {
  if (!isSystemLedgerKind(kind)) return "ignored";
  if (movementDate < selectedDate) return "before_selected_date";
  if (movementDate === selectedDate) return "on_selected_date";
  return "ignored";
}

function isSystemLedgerKind(kind: NormalizedMovementKind) {
  return kind === "receive" || kind === "use" || kind === "set_balance";
}

function getMovementDate(movement: RawMarinationLedgerMovement | MarinationLedgerMovement) {
  if ("movementDate" in movement && movement.movementDate !== undefined) return String(movement.movementDate);
  if ("movement_date" in movement && movement.movement_date !== undefined) return String(movement.movement_date);
  return "";
}
function getCreatedAt(movement: RawMarinationLedgerMovement | MarinationLedgerMovement) {
  if ("createdAt" in movement && movement.createdAt !== undefined) return String(movement.createdAt);
  if ("created_at" in movement && movement.created_at !== undefined) return String(movement.created_at);
  return "";
}
function getMovementKindSortOrder(movement: RawMarinationLedgerMovement | MarinationLedgerMovement) {
  const movementType = "movementType" in movement && movement.movementType !== undefined ? movement.movementType : "movement_type" in movement ? movement.movement_type : "";
  const kind = normalizeMovementKind(movementType);
  if (kind === "set_balance") return 0;
  if (kind === "use") return 1;
  if (kind === "receive") return 2;
  if (kind === "stock_check") return 3;
  return 4;
}
function getId(movement: RawMarinationLedgerMovement | MarinationLedgerMovement) { return String(movement.id ?? ""); }
