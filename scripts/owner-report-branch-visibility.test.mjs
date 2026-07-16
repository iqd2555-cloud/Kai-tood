import assert from "node:assert/strict";
import { normalizeDashboardReports, calculateOverallDashboardSummary } from "../lib/dashboard/inventory-summary.ts";

const date = "2026-07-13";
const lotus = { id: "lotus", name: "โลตัสป้อม 1", code: "LOTUS-POM1", is_active: true };
const navamin = { id: "navamin", name: "สาขาที่ 1", code: "NAVAMIN", is_active: true };
const other = { id: "other", name: "สาขาผู้บันทึก", code: "OTHER", is_active: true };

const regularStaffReport = { id: "r-regular", report_date: date, branch_id: navamin.id, submitted_by: "staff-navamin", total_sales: 5235, cash_sales: 5235, transfer_sales: 0, received_original_chicken: 10, updated_at: "2026-07-13T10:00:00Z" };
const substituteStaffReport = { id: "r-substitute", report_date: date, branch_id: lotus.id, submitted_by: "staff-other", total_sales: 7000, cash_sales: 6000, transfer_sales: 1000, received_original_chicken: 20, updated_at: "2026-07-13T11:00:00Z" };
const newerDuplicate = { ...substituteStaffReport, id: "r-substitute-newer", total_sales: 7100, updated_at: "2026-07-13T12:00:00Z" };

// Test 1: regular branch staff report is visible by branch_id and included in totals.
let summaries = normalizeDashboardReports([regularStaffReport], [navamin], date);
assert.equal(summaries[0].hasReport, true);
assert.equal(calculateOverallDashboardSummary(summaries, date).totalSales, 5235);

// Test 2: another authorized user can submit for Lotus; owner sees it under Lotus, not under the user's own branch.
summaries = normalizeDashboardReports([substituteStaffReport], [lotus, other], date);
assert.equal(summaries.find((item) => item.branchId === lotus.id)?.hasReport, true);
assert.equal(summaries.find((item) => item.branchId === lotus.id)?.totalSales, 7000);
assert.equal(summaries.find((item) => item.branchId === other.id)?.hasReport, false);

// Test 3: the target date total includes both branches when both reports exist.
summaries = normalizeDashboardReports([regularStaffReport, substituteStaffReport], [navamin, lotus], date);
assert.equal(calculateOverallDashboardSummary(summaries, date).totalSales, 12235);
assert.deepEqual(calculateOverallDashboardSummary(summaries, date).missingReportBranches, []);

// Test 4: reports without a permitted branch_id are not matched to any branch before insert/visibility.
summaries = normalizeDashboardReports([{ ...substituteStaffReport, id: "bad", branch_id: "unauthorized" }], [lotus], date);
assert.equal(summaries[0].hasReport, false);

// Test 5: reports on multiple days/users are still organized by branch_id + report_date, never by submitter.
summaries = normalizeDashboardReports([{ ...substituteStaffReport, report_date: "2026-07-14", submitted_by: "another-helper" }], [lotus], "2026-07-14");
assert.equal(summaries[0].branchId, lotus.id);
assert.equal(summaries[0].hasReport, true);

// Test 6: duplicate reports for one branch/date use the latest timestamp and never choose by submitted_by.
summaries = normalizeDashboardReports([substituteStaffReport, newerDuplicate], [lotus], date);
assert.equal(summaries[0].totalSales, 7100);
assert.equal(summaries[0].hasReport, true);

console.log("owner-report-branch-visibility tests passed");
