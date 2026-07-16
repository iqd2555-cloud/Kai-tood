import assert from "node:assert/strict";
import { calculateBranchDashboardSummary, calculateOverallDashboardSummary, normalizeDashboardReports, toNumberSafe } from "../lib/dashboard/inventory-summary.ts";
import { thaiDateISO } from "../lib/format.ts";

const date = "2026-06-24";
const branch1 = { id: "b1", name: "สาขาที่ 1 ร.ร.นวมินทร์", code: "B1", is_active: true };
const branch2 = { id: "b2", name: "สาขาที่ 2 โลตัสป้อม 1", code: "B2", is_active: true };
const branch3 = { id: "b3", name: "ไม่มีรายงาน", code: "B3", is_active: true };
const inactive = { id: "b4", name: "ปิดใช้งาน", code: "B4", is_active: false };

const report1 = {
  id: "r1", report_date: date, branch_id: "b1", cash_sales: 4782, transfer_sales: 0, total_sales: 4782,
  received_original_chicken: 20, received_spicy_chicken: 5, received_offal: 10, received_chicken_skin: 10,
  remaining_original_chicken: 2.6, remaining_ground_chicken: 1, remaining_offal: 5.2, remaining_chicken_skin: 2.7,
  updated_at: "2026-06-24T10:00:00Z", created_at: "2026-06-24T09:00:00Z",
};
const report2 = {
  id: "r2", report_date: date, branch_id: "b2", cash_sales: 7000, transfer_sales: 227, total_sales: 7227,
  received_original_chicken: 20, received_spicy_chicken: 10, received_ground_chicken: 5, received_drumstick: 5, received_offal: 10, received_chicken_skin: 10,
  remaining_ground_chicken: 1.7, remaining_drumstick: 2.8,
  updated_at: "2026-06-24T10:00:00Z", created_at: "2026-06-24T09:00:00Z",
};

const summary1 = calculateBranchDashboardSummary(report1, branch1, date);
assert.equal(summary1.totalSales, 4782);
assert.equal(summary1.chickenReceivedKg, 45);
assert.equal(summary1.chickenRemainingKg, 11.5);
assert.equal(summary1.chickenUsedByStockKg, 33.5);

const summary2 = calculateBranchDashboardSummary(report2, branch2, date);
assert.equal(summary2.totalSales, 7227);
assert.equal(summary2.chickenReceivedKg, 60);
assert.equal(summary2.chickenRemainingKg, 4.5);
assert.equal(summary2.chickenUsedByStockKg, 55.5);

const noReport = calculateBranchDashboardSummary(undefined, branch3, date);
assert.equal(noReport.status, "no_report");
assert.equal(noReport.hasReport, false);
assert.equal(noReport.chickenReceivedKg, 0);

const zeroUsed = calculateBranchDashboardSummary({ id: "zero", report_date: date, branch_id: "b1", total_sales: 100 }, branch1, date);
assert.equal(zeroUsed.salesPerChickenKg, null);

assert.equal(toNumberSafe(null), 0);
assert.equal(toNumberSafe(undefined), 0);
assert.equal(toNumberSafe(""), 0);
assert.equal(toNumberSafe("12.5"), 12.5);
assert.equal(toNumberSafe(Number.POSITIVE_INFINITY), 0);

const latestReport1 = { ...report1, id: "r1-new", total_sales: 5000, updated_at: "2026-06-24T11:00:00Z" };
const normalized = normalizeDashboardReports([report1, report2, latestReport1], [branch1, branch2, branch3, inactive], date);
assert.equal(normalized.length, 3, "inactive branch must not be included");
assert.equal(normalized.find((item) => item.branchId === "b1")?.totalSales, 5000, "duplicate branch/date must use latest updated_at");
assert.equal(normalized.find((item) => item.branchId === "b3")?.status, "no_report");
assert.equal(normalized.find((item) => item.branchId === "b2")?.hasReport, true, "owner dashboard must match submitted reports by branch_id");

const sameNameOtherBranch = { id: "b5", name: "สาขาที่ 2 โลตัสป้อม 1", code: "B5", is_active: true };
const normalizedDuplicateName = normalizeDashboardReports([report2], [branch2, sameNameOtherBranch], date);
assert.equal(normalizedDuplicateName.find((item) => item.branchId === "b2")?.hasReport, true, "matching branch_id report is submitted");
assert.equal(normalizedDuplicateName.find((item) => item.branchId === "b5")?.hasReport, false, "same branch name with different branch_id must not be treated as submitted");

assert.equal(thaiDateISO("2026-07-12T17:00:00.000Z"), "2026-07-13", "00:00 Bangkok must be Thai calendar date, not UTC date");
assert.equal(thaiDateISO("2026-07-13T17:59:59.000Z"), "2026-07-14", "00:59 Bangkok next day must not stay on UTC date");

const overall = calculateOverallDashboardSummary([summary1, summary2, noReport], date);
assert.equal(overall.totalSales, 12009);
assert.equal(overall.chickenReceivedKg, 105);
assert.equal(overall.chickenRemainingKg, 16);
assert.equal(overall.reportedBranchesCount, 2);
assert.deepEqual(overall.missingReportBranches, ["ไม่มีรายงาน"]);
assert.equal(Number.isFinite(overall.salesPerChickenKg ?? 0), true);

console.log("dashboard-summary tests passed");
