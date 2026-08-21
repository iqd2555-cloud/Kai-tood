import assert from "node:assert/strict";
import { buildCeoTodaySummary } from "../lib/ceo-today.ts";

const base = {
  id: "s1",
  business_date: "2026-08-19",
  branch_id: "b1",
  cash_sales: "5000",
  transfer_sales: "1000",
  total_sales: "6000",
  yesterday_sales: "5000",
  average_sales_30d: "5500",
  chicken_products_total_kg: "50",
  sticky_rice_used_kg: "30",
  packs_sold: 400,
  chicken_yield_packs_per_kg: "8",
  rice_yield_packs_per_kg: "13.33",
  branch_cash_in: "6000",
  branch_cash_out: "500",
  branch_net_cashflow: "5500",
  cash_variance: null,
  labor_cost: "1200",
  labor_cost_pct: "20",
  staff_present_count: 2,
  staff_late_count: 1,
  complaint_count: 0,
  open_alert_count: 1,
  critical_alert_count: 0,
  snapshot_status: "complete",
  data_quality_flags: {},
  calculated_at: "2026-08-19T12:00:00Z",
  branch: { code: "BR001", name: "สาขา 1" },
};

const second = {
  ...base,
  id: "s2",
  branch_id: "b2",
  cash_sales: 3000,
  transfer_sales: 2000,
  total_sales: 5000,
  yesterday_sales: 6000,
  average_sales_30d: 6000,
  chicken_products_total_kg: 40,
  sticky_rice_used_kg: 0,
  packs_sold: null,
  chicken_yield_packs_per_kg: null,
  rice_yield_packs_per_kg: null,
  branch_cash_in: 5000,
  branch_cash_out: 1000,
  branch_net_cashflow: 4000,
  labor_cost: null,
  staff_present_count: 3,
  staff_late_count: 0,
  branch: [{ code: "BR002", name: "สาขา 2" }],
};

const summary = buildCeoTodaySummary([base, second], {
  present_staff_count: 5,
  absent_staff_count: 1,
  late_staff_count: 1,
  approved_leave_count: 0,
  weekly_off_count: 0,
  attendance_is_final: true,
  kpi_expected_count: 5,
  kpi_complete_count: 4,
  kpi_incomplete_count: 1,
  kpi_is_final: true,
  synced_at: "2026-08-19T13:15:00Z",
});

assert.ok(summary);
assert.equal(summary.totalSales, 11000);
assert.equal(summary.cashSales, 8000);
assert.equal(summary.transferSales, 3000);
assert.equal(summary.packsSold, 400);
assert.equal(summary.packsReportedBranches, 1);
assert.equal(summary.branchesAwaitingPacks, 1);
assert.equal(summary.chickenYield, 8, "yield must use only branches that reported actual packs");
assert.equal(summary.riceYield, 400 / 30, "rice yield must not include missing packs from another branch");
assert.equal(summary.staffAbsent, 1);
assert.equal(summary.kpiIncomplete, 1);
assert.equal(summary.cashIn, 11000);
assert.equal(summary.cashOut, 1500);
assert.equal(summary.cashVariance, null, "missing cash variance must stay unknown, not zero");
assert.equal(summary.branches[1].branchCode, "BR002");

const invalidZeroPacks = buildCeoTodaySummary(
  [{ ...base, packs_sold: 0, total_sales: 1000 }],
  null,
);
assert.ok(invalidZeroPacks);
assert.equal(invalidZeroPacks.packsReportedBranches, 0);
assert.equal(invalidZeroPacks.branchesAwaitingPacks, 1);
assert.equal(invalidZeroPacks.chickenYield, null);
assert.equal(invalidZeroPacks.branches[0].packsSold, null);

assert.equal(buildCeoTodaySummary([], null), null);

console.log("ceo-today summary tests passed");
