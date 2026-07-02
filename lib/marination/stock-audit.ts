import type { ChickenPart, MarinationStockMovement } from "@/lib/marination";

export type MarinationMovementAuditBucket = "opening" | "today_receive" | "today_use" | "today_adjustment" | "ignored";

export type MarinationMovementAuditRow = {
  id: string;
  date: string;
  partName: string;
  movementType: string;
  quantityKg: number;
  signedQuantityKg: number;
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

const knownMovementTypes = new Set(["received", "used", "counted", "adjustment"]);

export function buildMarinationCalculationAudit({ selectedDate, part, movements }: { selectedDate: string; part: Pick<ChickenPart, "id" | "name">; movements: AuditMovement[]; }): MarinationPartCalculationAudit {
  const partMovements = movements.filter((movement) => movement.chicken_part_id === part.id).slice().sort(compareMovementsForAudit);
  const warnings: string[] = [];
  const duplicateIds = findDuplicateIds(partMovements);
  if (duplicateIds.length > 0) warnings.push(`พบ duplicate id: ${duplicateIds.map(shortId).join(", ")}`);

  let replayBalance = 0;
  const rows = partMovements.map((movement) => {
    const quantityKg = Number(movement.quantity_kg) || 0;
    const bucket = getAuditBucket(movement, selectedDate);
    const previousBalance = replayBalance;
    const signedQuantityKg = getSignedQuantity(movement.movement_type, quantityKg, bucket, previousBalance);
    if (bucket !== "ignored") replayBalance += signedQuantityKg;
    const row: MarinationMovementAuditRow = { id: movement.id, date: movement.movement_date, partName: part.name, movementType: movement.movement_type, quantityKg, signedQuantityKg, bucket, reason: getAuditReason(movement, selectedDate, bucket), note: movement.note ?? null, createdAt: movement.created_at ?? null };
    if (!knownMovementTypes.has(movement.movement_type)) warnings.push(`พบ movement_type ที่ไม่รู้จัก: ${movement.movement_type || "(ว่าง)"} ในรายการ ${shortId(movement.id)}`);
    if (movement.movement_type === "counted" && row.signedQuantityKg !== 0) warnings.push(`พบ stock_check/count ถูกนำไปกระทบยอดในรายการ ${shortId(movement.id)}`);
    if (movement.movement_type === "adjustment" && movement.note?.includes("คงเหลือเป็น")) warnings.push(`รายการปรับยอด ${shortId(movement.id)} อาจเป็นการแปลง target remaining เป็น delta แล้ว โปรดตรวจ note`);
    return row;
  });

  const openingRows = rows.filter((row) => row.bucket === "opening");
  const todayReceiveRows = rows.filter((row) => row.bucket === "today_receive");
  const todayUseRows = rows.filter((row) => row.bucket === "today_use");
  const todayAdjustmentRows = rows.filter((row) => row.bucket === "today_adjustment");
  const ignoredRows = rows.filter((row) => row.bucket === "ignored");
  const openingKg = sumSigned(openingRows);
  const totalReceiveBeforeDate = sumQuantity(openingRows.filter((row) => row.movementType === "received"));
  const totalUseBeforeDate = sumQuantity(openingRows.filter((row) => row.movementType === "used"));
  const adjustmentEffectsBeforeDate = sumSigned(openingRows.filter((row) => row.movementType === "adjustment"));
  const stockCheckIgnoredBeforeDate = sumQuantity(ignoredRows.filter((row) => row.date < selectedDate && row.movementType === "counted"));
  const receivedKg = sumQuantity(todayReceiveRows);
  const usedKg = sumQuantity(todayUseRows);
  const adjustmentKg = sumSigned(todayAdjustmentRows);
  const systemRemainingKg = openingKg + receivedKg - usedKg + adjustmentKg;

  return { selectedDate, partName: part.name, openingKg, receivedKg, usedKg, adjustmentKg, systemRemainingKg, formulaText: `${openingKg} + ${receivedKg} - ${usedKg} + ${adjustmentKg} = ${systemRemainingKg}`, totalReceiveBeforeDate, totalUseBeforeDate, adjustmentEffectsBeforeDate, stockCheckIgnoredBeforeDate, openingRows, todayReceiveRows, todayUseRows, todayAdjustmentRows, ignoredRows, warnings: Array.from(new Set(warnings)) };
}

function getAuditBucket(movement: AuditMovement, selectedDate: string): MarinationMovementAuditBucket {
  if (movement.movement_date < selectedDate && ["received", "used", "adjustment"].includes(movement.movement_type)) return "opening";
  if (movement.movement_date === selectedDate && movement.movement_type === "received") return "today_receive";
  if (movement.movement_date === selectedDate && movement.movement_type === "used") return "today_use";
  if (movement.movement_date === selectedDate && movement.movement_type === "adjustment") return "today_adjustment";
  return "ignored";
}
function getSignedQuantity(type: string, quantityKg: number, bucket: MarinationMovementAuditBucket, previousBalance: number) { if (bucket === "ignored") return 0; if (type === "used") return -quantityKg; if (type === "received") return quantityKg; if (type === "adjustment") return quantityKg - previousBalance; return 0; }
function getAuditReason(movement: AuditMovement, selectedDate: string, bucket: MarinationMovementAuditBucket) { if (bucket === "opening" && movement.movement_type === "adjustment") return `movement_date < ${selectedDate} และเป็นปรับยอดแบบตั้งยอดใหม่ จึงใช้ผลต่างจากยอดก่อนหน้า`; if (bucket === "opening") return `movement_date < ${selectedDate} จึงนำไปคิดในยอดยกมา`; if (bucket === "today_receive") return "รับเข้าวันที่เลือก นับเป็นบวก"; if (bucket === "today_use") return "ใช้หมักวันที่เลือก นับเป็นลบ"; if (bucket === "today_adjustment") return "ปรับยอดวันที่เลือกเป็นการตั้งยอดใหม่ ผลต่อสต๊อกคือ target ลบยอดก่อนหน้า"; if (movement.movement_type === "counted") return "ตรวจนับจริงใช้แสดงผลเท่านั้น ไม่กระทบยอดระบบ"; if (!knownMovementTypes.has(movement.movement_type)) return "movement_type ไม่รู้จัก จึงไม่นำมาคิด"; if (movement.movement_date > selectedDate) return "movement_date หลังวันที่เลือก จึงไม่นำมาคิด"; return "ไม่เข้าเงื่อนไข ledger ของวันที่เลือก"; }
function compareMovementsForAudit(a: AuditMovement, b: AuditMovement) { return a.movement_date.localeCompare(b.movement_date) || (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id); }
function sumSigned(rows: MarinationMovementAuditRow[]) { return rows.reduce((sum, row) => sum + row.signedQuantityKg, 0); }
function sumQuantity(rows: MarinationMovementAuditRow[]) { return rows.reduce((sum, row) => sum + row.quantityKg, 0); }
function findDuplicateIds(movements: AuditMovement[]) { const seen = new Set<string>(); const duplicates = new Set<string>(); for (const movement of movements) { if (seen.has(movement.id)) duplicates.add(movement.id); seen.add(movement.id); } return Array.from(duplicates); }
function shortId(id: string) { return id.slice(0, 8); }
