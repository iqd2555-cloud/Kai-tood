import assert from "node:assert/strict";
import { calculateCashFlowSummary } from "../lib/cash-flow.ts";

const entries = [
  { id: "income-1", type: "income", status: "received", transaction_date: "2026-06-28", amount: 7971 },
  { id: "income-2", type: "income", status: "received", transaction_date: "2026-06-28", amount: "5548" },
  { id: "expense-1", type: "expense", status: "paid", transaction_date: "2026-06-28", amount: 1088 },
  { id: "pending-income", type: "income", status: "pending_receive", transaction_date: "2026-06-28", amount: 9999 },
  { id: "pending-expense", type: "expense", status: "pending_pay", transaction_date: "2026-06-28", amount: 9999 },
  { id: "other-date", type: "income", status: "received", transaction_date: "2026-06-27", amount: 9999 },
];

const summary = calculateCashFlowSummary(entries, "2026-06-28", "2026-06-01", "2026-06-28");
assert.equal(summary.selectedDate, "2026-06-28");
assert.equal(summary.todayIncome, 13519);
assert.equal(summary.todayExpense, 1088);
assert.equal(summary.todayNetCash, 12431);
assert.equal(summary.todayCash, 12431);

const nonIsoSelectedDate = calculateCashFlowSummary(entries, "28/06/2026", "2026-06-01", "2026-06-28");
assert.equal(nonIsoSelectedDate.selectedDate, "");
assert.equal(nonIsoSelectedDate.todayIncome, 0, "non-ISO selectedDate must never match ISO transaction_date values");

console.log("cash-flow-summary tests passed");
