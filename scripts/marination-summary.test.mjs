import assert from "node:assert/strict";
import { buildMarinationSummaries, calculateMarinationSystemBalance } from "../lib/marination.ts";

const parts = [
  { id: "bl-scrap", name: "เศษ BL", sort_order: 1, is_active: true },
  { id: "offal", name: "เครื่องใน", sort_order: 2, is_active: true },
  { id: "skin", name: "หนังไก่", sort_order: 3, is_active: true },
];

const movements = [
  movement("m0", "2026-07-01", "bl-scrap", "received", 80, "ยอดคงเหลือก่อนหน้า"),
  movement("m1", "2026-07-01", "offal", "received", 100, "รับเข้าเมื่อวาน"),
  movement("m2", "2026-07-01", "offal", "used", 15),
  movement("m3", "2026-07-01", "skin", "adjustment", 40),
  movement("m4", "2026-07-02", "offal", "used", 40, "ใช้หมักวันนี้"),
  movement("m5", "2026-07-02", "offal", "counted", 43, "ตรวจนับรอบเย็น"),
  movement("m6", "2026-07-02", "bl-scrap", "used", 80, "ใช้หมักให้หมดพอดี"),
];

const { summaries, totals } = buildMarinationSummaries(parts, movements, "2026-07-02");
const blScrap = summaries.find((summary) => summary.partId === "bl-scrap");
assert.equal(blScrap.openingKg, 80, "selected date must carry forward the previous day's BL scrap balance");
assert.equal(blScrap.usedKg, 80);
assert.equal(blScrap.systemRemainingKg, 0, "using the exact carried-forward balance must not create a negative stock bug");

const offal = summaries.find((summary) => summary.partId === "offal");
assert.equal(offal.openingKg, 85, "selected date must carry forward previous system balance");
assert.equal(offal.receivedKg, 0);
assert.equal(offal.usedKg, 40);
assert.equal(offal.systemRemainingKg, 45, "system balance must be opening + received - used + adjustment");
assert.equal(offal.latestPhysicalCountKg, 43, "count is displayed separately");
assert.equal(offal.varianceKg, -2, "count must not overwrite system balance");
assert.equal(offal.latestNote, "ใช้หมักวันนี้", "latest note should come from selected-date movements only");
assert.equal(totals.opening, 205);
assert.equal(totals.systemBalance, 85);
assert.equal(calculateMarinationSystemBalance(movements), 85);

console.log("marination-summary tests passed");

function movement(id, movement_date, chicken_part_id, movement_type, quantity_kg, note = null) {
  return {
    id,
    movement_date,
    chicken_part_id,
    movement_type,
    quantity_kg,
    note,
    created_by: "user-1",
    created_at: `${movement_date}T08:00:00.000Z`,
  };
}
