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
  movement("m8-adjust", "2026-07-01", "bl-scrap", "adjustment", 50, "ตั้งยอดใหม่ให้เหลือ 50 กก.", "2026-07-01T07:00:00.000Z"),
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
assertPart("bl-scrap", 80, 80, 100);
const blScrap = summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(blScrap.receivedKg, 100);
const blScrapAudit = buildMarinationCalculationAudit({ selectedDate: "2026-07-02", part: parts[0], movements });
assert.equal(blScrapAudit.openingKg, 80);
assert.equal(blScrapAudit.receivedKg, 100);
assert.equal(blScrapAudit.usedKg, 80);
assert.equal(blScrapAudit.systemRemainingKg, 100);
assert.equal(blScrapAudit.adjustmentKg, 0);
assert.equal(blScrap.adjustmentKg, 0);
assert.equal(blScrapAudit.totalReceiveBeforeDate, 200);
assert.equal(blScrapAudit.totalUseBeforeDate, 90);
assert.equal(blScrapAudit.adjustmentEffectsBeforeDate, -30);
assert.equal(blScrapAudit.stockCheckIgnoredBeforeDate, 120);
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
assert.equal(totals.opening, 265);
assert.equal(totals.systemBalance, 160);
assert.equal(sumOpeningByPart(movements.filter((item) => item.movement_date < "2026-07-02")), 265);
assert.equal(sumClosingByPart(movements, "2026-07-01"), totals.opening, "2026-07-02 opening must equal 2026-07-01 system closing after received, used, and adjustments");
assert.equal(sumSystemBalanceByPart(movements), totals.systemBalance);

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
