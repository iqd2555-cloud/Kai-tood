import assert from "node:assert/strict";
import { buildMarinationSummaries, calculateMarinationClosingBalanceOnDate, calculateMarinationOpeningBalance, calculateMarinationSystemBalance } from "../lib/marination.ts";
import { buildMarinationCalculationAudit } from "../lib/marination/stock-audit.ts";

const parts = [
  { id: "bl-scrap", name: "เศษ BL", sort_order: 1, is_active: true },
  { id: "bb-scrap", name: "เศษ BB", sort_order: 2, is_active: true },
  { id: "skin", name: "หนังไก่", sort_order: 3, is_active: true },
  { id: "small-drumstick", name: "น่องเล็ก", sort_order: 4, is_active: true },
  { id: "chopped", name: "ไก่สับ", sort_order: 5, is_active: true },
  { id: "offal", name: "เครื่องใน", sort_order: 6, is_active: true },
  { id: "whole-offal", name: "เครื่องในไม่ผ่า", sort_order: 7, is_active: true },
];

const movements = [
  movement("m0", "2026-06-30", "bl-scrap", "received", 120, "รับเข้าก่อนหน้า"),
  movement("m1", "2026-06-30", "bl-scrap", "used", 40),
  movement("m2", "2026-07-01", "bb-scrap", "adjustment", 30, "ปิดยอดเศษ BB"),
  movement("m3", "2026-07-01", "skin", "adjustment", 40, "ปิดยอดหนังไก่"),
  movement("m4", "2026-07-01", "small-drumstick", "adjustment", 10, "ปิดยอดน่องเล็ก"),
  movement("m5", "2026-07-01", "chopped", "adjustment", 5, "ปิดยอดไก่สับ"),
  movement("m6", "2026-07-01", "offal", "received", 100, "รับเข้าเมื่อวาน"),
  movement("m7", "2026-07-01", "offal", "used", 15),
  movement("m8", "2026-07-01", "whole-offal", "adjustment", 15, "ปิดยอดเครื่องในไม่ผ่า"),
  movement("m8-adjust-superseded-40", "2026-07-01", "bl-scrap", "adjustment", 40, "ปรับยอดรอบแรก ต้องถูกแทนที่", "2026-07-01T06:00:00.000Z"),
  movement("m8-adjust-superseded-75", "2026-07-01", "bl-scrap", "set_balance", 75, "ปรับยอดรอบสอง ต้องถูกแทนที่", "2026-07-01T06:30:00.000Z"),
  movement("m8-adjust", "2026-07-01", "bl-scrap", "set_balance", 50, "ตั้งยอดใหม่ให้เหลือ 50 กก.", "2026-07-01T07:00:00.000Z"),
  movement("m8-use", "2026-07-01", "bl-scrap", "used", 50, "ใช้หมัก 50 กก. หลังตั้งยอดใหม่", "2026-07-01T08:00:00.000Z"),
  movement("m8-receive-70", "2026-07-01", "bl-scrap", "received", 70, "รับเข้า 70 กก.", "2026-07-01T09:00:00.000Z"),
  movement("m8-receive-10", "2026-07-01", "bl-scrap", "received", 10, "รับเข้า 10 กก. ยอดปิดต้องเป็น 80 กก.", "2026-07-01T10:00:00.000Z"),
  movement("m8-count", "2026-07-01", "bl-scrap", "counted", 120, "ตรวจนับจริงไม่กระทบยอดระบบ", "2026-07-01T11:00:00.000Z"),
  movement("m8-created-next-day", "2026-07-01", "bl-scrap", "used", 0, "ใช้ movement_date แม้ created_at ข้ามวัน", "2026-07-02T01:00:00.000Z"),
  movement("m8-future", "2026-07-02", "bl-scrap", "received", 100, "รับเข้าวันที่เลือก ห้ามนับในยอดยกมา"),
  movement("m9", "2026-07-02", "bl-scrap", "used", 80, "ใช้หมักให้หมดพอดี"),
  movement("m10", "2026-07-02", "bb-scrap", "used", 30),
  movement("m11", "2026-07-02", "skin", "used", 40),
  movement("m12", "2026-07-02", "small-drumstick", "used", 10),
  movement("m13", "2026-07-02", "chopped", "used", 5),
  movement("m14", "2026-07-02", "offal", "used", 40, "ใช้หมักวันนี้"),
  movement("m15", "2026-07-02", "offal", "counted", 43, "ตรวจนับรอบเย็น"),
];

const { summaries, totals } = buildMarinationSummaries(parts, movements, "2026-07-02");
assertPart("bl-scrap", 50, 80, 70);
const blScrap = summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(blScrap.receivedKg, 100);
const blScrapAudit = buildMarinationCalculationAudit({ selectedDate: "2026-07-02", part: parts[0], movements });
assert.equal(blScrapAudit.openingKg, 50);
assert.equal(blScrapAudit.receivedKg, 100);
assert.equal(blScrapAudit.usedKg, 80);
assert.equal(blScrapAudit.systemRemainingKg, 70);
assert.equal(blScrapAudit.adjustmentKg, 0);
assert.equal(blScrapAudit.formulaText, "50 + 100 - 80 + 0 = 70");
assert.equal(blScrap.adjustmentKg, 0);
assert.equal(blScrapAudit.totalReceiveBeforeDate, 200);
assert.equal(blScrapAudit.totalUseBeforeDate, 90);
assert.equal(blScrapAudit.adjustmentEffectsBeforeDate, -60);
assert.equal(blScrapAudit.ignoredRows.filter((row) => row.bucket === "ignored" && row.reason.includes("แทนที่")).length, 2);
assert.equal(blScrapAudit.stockCheckIgnoredBeforeDate, 120);

const blScrapOutOfEntryOrderMovements = [
  movement("late-use", "2026-07-01", "bl-scrap", "used", 50, "ใช้หมักก่อนบันทึกปรับยอด", "2026-07-01T07:00:00.000Z"),
  movement("late-receive-70", "2026-07-01", "bl-scrap", "received", 70, "รับเข้า 70 กก.", "2026-07-01T08:00:00.000Z"),
  movement("late-receive-10", "2026-07-01", "bl-scrap", "received", 10, "รับเข้า 10 กก.", "2026-07-01T09:00:00.000Z"),
  movement("late-adjust", "2026-07-01", "bl-scrap", "adjustment", 50, "ตั้งยอดใหม่ให้เหลือ 50 กก. แม้บันทึกทีหลัง", "2026-07-01T23:00:00.000Z"),
  movement("next-receive", "2026-07-02", "bl-scrap", "received", 100, "รับเข้าวันที่เลือก"),
  movement("next-use", "2026-07-02", "bl-scrap", "used", 80, "ใช้หมักวันที่เลือก"),
];
const outOfEntryOrderAudit = buildMarinationCalculationAudit({ selectedDate: "2026-07-02", part: parts[0], movements: blScrapOutOfEntryOrderMovements });
assert.equal(outOfEntryOrderAudit.openingKg, 50, "the latest daily adjustment is the authoritative 2026-07-01 closing snapshot");
assert.equal(outOfEntryOrderAudit.receivedKg, 100);
assert.equal(outOfEntryOrderAudit.usedKg, 80);
assert.equal(outOfEntryOrderAudit.adjustmentKg, 0);
assert.equal(outOfEntryOrderAudit.systemRemainingKg, 70);
assert.equal(outOfEntryOrderAudit.formulaText, "50 + 100 - 80 + 0 = 70");

const adjustmentClosesAtExactTarget = [
  movement("target-opening", "2026-07-10", "bl-scrap", "received", 100),
  movement("target-receive", "2026-07-11", "bl-scrap", "received", 70),
  movement("target-use", "2026-07-11", "bl-scrap", "used", 80),
  movement("target-close", "2026-07-11", "bl-scrap", "adjustment", 50, "ชั่งจริงและปิดยอดเป็น 50 กก.", "2026-07-11T18:00:00.000Z"),
];
const targetDay = buildMarinationSummaries(parts, adjustmentClosesAtExactTarget, "2026-07-11").summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(targetDay.openingKg, 100);
assert.equal(targetDay.receivedKg, 70);
assert.equal(targetDay.usedKg, 80);
assert.equal(targetDay.adjustmentKg, -40);
assert.equal(targetDay.systemRemainingKg, 50, "adjustment target must be the exact displayed closing balance");
const targetNextDay = buildMarinationSummaries(parts, adjustmentClosesAtExactTarget, "2026-07-12").summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(targetNextDay.openingKg, 50, "the exact adjusted closing must carry forward to the next day");
assert.equal(targetNextDay.systemRemainingKg, 50);

const multipleSameDayAdjustments = [
  movement("multi-adjust-1", "2026-07-01", "bl-scrap", "adjustment", 50, "ปรับยอดเก่าถูกแทนที่", "2026-07-01T07:00:00.000Z"),
  movement("multi-adjust-2", "2026-07-01", "bl-scrap", "adjustment", 90, "ปรับยอดเก่าถูกแทนที่", "2026-07-01T08:00:00.000Z"),
  movement("multi-adjust-final", "2026-07-01", "bl-scrap", "adjustment", 50, "ปรับยอดล่าสุดของวัน", "2026-07-01T09:00:00.000Z"),
  movement("multi-use", "2026-07-01", "bl-scrap", "used", 50, "ใช้หมัก 50", "2026-07-01T10:00:00.000Z"),
  movement("multi-receive-70", "2026-07-01", "bl-scrap", "received", 70, "รับเข้า 70", "2026-07-01T11:00:00.000Z"),
  movement("multi-receive-10", "2026-07-01", "bl-scrap", "received", 10, "รับเข้า 10", "2026-07-01T12:00:00.000Z"),
  movement("multi-next-receive", "2026-07-02", "bl-scrap", "received", 100, "รับเข้า 100"),
  movement("multi-next-use", "2026-07-02", "bl-scrap", "used", 80, "ใช้หมัก 80"),
];
const multipleSameDayAudit = buildMarinationCalculationAudit({ selectedDate: "2026-07-02", part: parts[0], movements: multipleSameDayAdjustments });
assert.equal(multipleSameDayAudit.openingKg, 50, "only the latest same-day adjustment must become the 2026-07-01 closing balance");
assert.equal(multipleSameDayAudit.receivedKg, 100);
assert.equal(multipleSameDayAudit.usedKg, 80);
assert.equal(multipleSameDayAudit.systemRemainingKg, 70);
assert.equal(multipleSameDayAudit.ignoredRows.filter((row) => row.reason.includes("แทนที่")).length, 2);

assertPart("bb-scrap", 30, 30, 0);
assertPart("skin", 40, 40, 0);
assertPart("small-drumstick", 10, 10, 0);
assertPart("chopped", 5, 5, 0);
assertPart("offal", 85, 40, 45);
assertPart("whole-offal", 15, 0, 15);

const offal = summaries.find((summary) => summary.partId === "offal");
assert.equal(offal.receivedKg, 0);
assert.equal(offal.latestPhysicalCountKg, 43, "count is displayed separately");
assert.equal(offal.varianceKg, -2, "count must not overwrite system balance");
assert.equal(offal.latestNote, "ใช้หมักวันนี้", "latest note should come from selected-date movements only");
assert.equal(totals.opening, 235);
assert.equal(totals.systemBalance, 130);
assert.equal(sumOpeningByPart(movements.filter((item) => item.movement_date < "2026-07-02")), 235);
assert.equal(sumClosingByPart(movements, "2026-07-01"), totals.opening, "2026-07-02 opening must equal 2026-07-01 system closing after received, used, and adjustments");
assert.equal(sumSystemBalanceByPart(movements), totals.systemBalance);

const stockResetMovements = [
  movement("old-receive", "2026-07-01", "bl-scrap", "received", 30, "ข้อมูลเก่าก่อน reset ต้องไม่ถูกนำมาคิด"),
  movement("reset-adjust", "2026-07-03", "bl-scrap", "adjustment", 100, "ตั้งต้นเศษ BL ใหม่เป็น 100 กก.", "2026-07-03T08:00:00.000Z"),
  movement("reset-use", "2026-07-03", "bl-scrap", "used", 20, "movement วัน reset ต้องไม่หักจาก snapshot", "2026-07-03T09:00:00.000Z"),
  movement("reset-receive", "2026-07-03", "bl-scrap", "received", 50, "movement วัน reset ต้องไม่บวกจนกลายเป็น 130", "2026-07-03T10:00:00.000Z"),
];
const stockResetSummary = buildMarinationSummaries(parts, stockResetMovements, "2026-07-04", "2026-07-03").summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(stockResetSummary.openingKg, 100, "2026-07-04 opening must start from the reset-date adjustment only");
assert.equal(stockResetSummary.receivedKg, 0);
assert.equal(stockResetSummary.usedKg, 0);
assert.equal(stockResetSummary.systemRemainingKg, 100, "old 30 kg before stock reset must not leak into current balance");
const stockResetAudit = buildMarinationCalculationAudit({ selectedDate: "2026-07-04", part: parts[0], movements: stockResetMovements, stockResetDate: "2026-07-03" });
assert.equal(stockResetAudit.stockResetDate, "2026-07-03");
assert.equal(stockResetAudit.ignoredRows.filter((row) => row.id === "old-receive" && row.reason.includes("Stock Reset Date")).length, 1);
assert.equal(stockResetAudit.ignoredRows.filter((row) => ["reset-use", "reset-receive"].includes(row.id) && row.reason.includes("snapshot")).length, 2);

console.log("marination-summary tests passed");

function assertPart(partId, openingKg, usedKg, systemRemainingKg) {
  const summary = summaries.find((item) => item.partId === partId);
  assert.equal(summary.openingKg, openingKg, `${partId} must carry forward the previous closed system balance`);
  assert.equal(summary.usedKg, usedKg, `${partId} must use only selected-date usage`);
  assert.equal(summary.systemRemainingKg, systemRemainingKg, `${partId} must calculate opening + received - used + adjustment`);
}

function sumSystemBalanceByPart(allMovements) {
  return parts.reduce((sum, part) => sum + calculateMarinationSystemBalance(allMovements.filter((item) => item.chicken_part_id === part.id)), 0);
}

function sumOpeningByPart(allMovements) {
  return parts.reduce((sum, part) => sum + calculateMarinationOpeningBalance(allMovements.filter((item) => item.chicken_part_id === part.id)), 0);
}

function sumClosingByPart(allMovements, closingDate) {
  return parts.reduce((sum, part) => sum + calculateMarinationClosingBalanceOnDate(allMovements.filter((item) => item.chicken_part_id === part.id), closingDate), 0);
}

function movement(id, movement_date, chicken_part_id, movement_type, quantity_kg, note = null, created_at = `${movement_date}T08:00:00.000Z`) {
  return {
    id,
    movement_date,
    chicken_part_id,
    movement_type,
    quantity_kg,
    note,
    created_by: "user-1",
    created_at,
  };
}
