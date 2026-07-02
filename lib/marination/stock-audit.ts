import { replayMarinationLedgerForDate, type ChickenPart, type LedgerReplayRow, type MarinationStockMovement } from "../marination.ts";

export type MarinationMovementAuditBucket = "opening" | "today_receive" | "today_use" | "today_adjustment" | "ignored";

export type MarinationMovementAuditRow = {
  id: string;
  date: string;
  partName: string;
  movementType: string;
  quantityKg: number;
  signedQuantityKg: number;
  balanceBefore: number;
  balanceAfter: number;
  bucket: MarinationMovementAuditBucket;
  reason: string;
  note: string | null;
  createdAt: string | null;
};

export type MarinationPartCalculationAudit = {
  selectedDate: string;
  partName: string;
  openingKg: number;
  receivedKg: number;
  usedKg: number;
  adjustmentKg: number;
  systemRemainingKg: number;
  formulaText: string;
  totalReceiveBeforeDate: number;
  totalUseBeforeDate: number;
  adjustmentEffectsBeforeDate: number;
  stockCheckIgnoredBeforeDate: number;
  openingRows: MarinationMovementAuditRow[];
  todayReceiveRows: MarinationMovementAuditRow[];
  todayUseRows: MarinationMovementAuditRow[];
  todayAdjustmentRows: MarinationMovementAuditRow[];
  ignoredRows: MarinationMovementAuditRow[];
  warnings: string[];
};

type AuditMovement = MarinationStockMovement & { movement_type: string };

export function buildMarinationCalculationAudit({ selectedDate, part, movements }: { selectedDate: string; part: Pick<ChickenPart, "id" | "name">; movements: AuditMovement[]; }): MarinationPartCalculationAudit {
  const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id);
  const duplicateIds = findDuplicateIds(partMovements);
  const replay = replayMarinationLedgerForDate(partMovements, selectedDate);
  const warnings = [...replay.warnings];
  if (duplicateIds.length > 0) warnings.push(`พบ duplicate id: ${duplicateIds.map(shortId).join(", ")}`);

  const openingRows = replay.rowsBeforeDate.map((row) => toAuditRow(row, part.name, "opening"));
  const todayRows = replay.rowsOnDate.map((row) => toAuditRow(row, part.name, getTodayBucket(row.movementType)));
  const ignoredRows = replay.ignoredRows.map((row) => toAuditRow(row, part.name, "ignored"));
  const todayReceiveRows = todayRows.filter((row) => row.bucket === "today_receive");
  const todayUseRows = todayRows.filter((row) => row.bucket === "today_use");
  const todayAdjustmentRows = todayRows.filter((row) => row.bucket === "today_adjustment");

  const totalReceiveBeforeDate = sumQuantity(openingRows.filter((row) => row.movementType === "received"));
  const totalUseBeforeDate = sumQuantity(openingRows.filter((row) => row.movementType === "used"));
  const adjustmentEffectsBeforeDate = sumSigned(openingRows.filter((row) => row.movementType === "adjustment"));
  const stockCheckIgnoredBeforeDate = sumQuantity(ignoredRows.filter((row) => row.date < selectedDate && row.movementType === "counted"));

  return {
    selectedDate,
    partName: part.name,
    openingKg: replay.openingKg,
    receivedKg: replay.receivedKg,
    usedKg: replay.usedKg,
    adjustmentKg: replay.adjustmentDeltaKg,
    systemRemainingKg: replay.systemRemainingKg,
    formulaText: `${replay.openingKg} + ${replay.receivedKg} - ${replay.usedKg} + ${replay.adjustmentDeltaKg} = ${replay.systemRemainingKg}`,
    totalReceiveBeforeDate,
    totalUseBeforeDate,
    adjustmentEffectsBeforeDate,
    stockCheckIgnoredBeforeDate,
    openingRows,
    todayReceiveRows,
    todayUseRows,
    todayAdjustmentRows,
    ignoredRows,
    warnings: Array.from(new Set(warnings)),
  };
}

function toAuditRow(row: LedgerReplayRow, partName: string, bucket: MarinationMovementAuditBucket): MarinationMovementAuditRow {
  return { id: row.id, date: row.movementDate, partName, movementType: row.movementType, quantityKg: row.quantityKg, signedQuantityKg: row.signedEffect, balanceBefore: row.balanceBefore, balanceAfter: row.balanceAfter, bucket, reason: row.reason, note: row.note ?? null, createdAt: row.createdAt };
}

function getTodayBucket(movementType: string): MarinationMovementAuditBucket {
  if (movementType === "received") return "today_receive";
  if (movementType === "used") return "today_use";
  if (movementType === "adjustment") return "today_adjustment";
  return "ignored";
}

function sumSigned(rows: MarinationMovementAuditRow[]) { return rows.reduce((sum, row) => sum + row.signedQuantityKg, 0); }
function sumQuantity(rows: MarinationMovementAuditRow[]) { return rows.reduce((sum, row) => sum + row.quantityKg, 0); }
function findDuplicateIds(movements: AuditMovement[]) { const seen = new Set<string>(); const duplicates = new Set<string>(); for (const movement of movements) { if (seen.has(movement.id)) duplicates.add(movement.id); seen.add(movement.id); } return Array.from(duplicates); }
function shortId(id: string) { return id.slice(0, 8); }
