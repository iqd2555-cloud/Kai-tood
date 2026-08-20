export type CeoSnapshotNumber = number | string | null;

export type CeoSnapshotRow = {
  id: string;
  business_date: string;
  branch_id: string;
  cash_sales: CeoSnapshotNumber;
  transfer_sales: CeoSnapshotNumber;
  total_sales: CeoSnapshotNumber;
  yesterday_sales: CeoSnapshotNumber;
  average_sales_30d: CeoSnapshotNumber;
  chicken_products_total_kg: CeoSnapshotNumber;
  sticky_rice_used_kg: CeoSnapshotNumber;
  packs_sold: number | null;
  chicken_yield_packs_per_kg: CeoSnapshotNumber;
  rice_yield_packs_per_kg: CeoSnapshotNumber;
  branch_cash_in: CeoSnapshotNumber;
  branch_cash_out: CeoSnapshotNumber;
  branch_net_cashflow: CeoSnapshotNumber;
  cash_variance: CeoSnapshotNumber;
  labor_cost: CeoSnapshotNumber;
  labor_cost_pct: CeoSnapshotNumber;
  staff_present_count: number | null;
  staff_late_count: number | null;
  complaint_count: number | null;
  open_alert_count: number | null;
  critical_alert_count: number | null;
  snapshot_status: string;
  data_quality_flags: Record<string, unknown> | null;
  calculated_at: string;
  branch?: { code: string | null; name: string | null } | { code: string | null; name: string | null }[] | null;
};

export type CeoAlertRow = {
  id: string;
  alert_date: string;
  branch_id: string | null;
  rule_code: string;
  severity: string;
  metric_value: CeoSnapshotNumber;
  threshold_value: CeoSnapshotNumber;
  title: string;
  message: string;
  status: string;
};

export type CeoCompanyPeopleRow = {
  present_staff_count: number | null;
  absent_staff_count: number | null;
  late_staff_count: number | null;
  approved_leave_count: number | null;
  weekly_off_count: number | null;
  attendance_is_final: boolean | null;
  kpi_expected_count: number | null;
  kpi_complete_count: number | null;
  kpi_incomplete_count: number | null;
  kpi_is_final: boolean | null;
  synced_at: string | null;
};

export type CeoBranchSummary = {
  branchId: string;
  branchCode: string;
  branchName: string;
  totalSales: number;
  salesVs30dPct: number | null;
  packsSold: number | null;
  chickenKg: number;
  chickenYield: number | null;
  riceKg: number;
  riceYield: number | null;
  staffPresent: number;
  staffLate: number;
  alertCount: number;
};

export type CeoTodaySummary = {
  businessDate: string;
  calculatedAt: string;
  branchCount: number;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  yesterdaySales: number;
  averageSales30d: number;
  salesVsYesterdayPct: number | null;
  salesVs30dPct: number | null;
  packsSold: number;
  packsReportedBranches: number;
  chickenKg: number;
  chickenYield: number | null;
  riceKg: number;
  riceYield: number | null;
  cashIn: number;
  cashOut: number;
  netCashflow: number;
  cashVariance: number | null;
  laborCost: number | null;
  laborCostPct: number | null;
  staffPresent: number;
  staffAbsent: number | null;
  staffLate: number;
  approvedLeave: number | null;
  kpiExpected: number | null;
  kpiIncomplete: number | null;
  complaintCount: number;
  openAlertCount: number;
  criticalAlertCount: number;
  branchesAwaitingPacks: number;
  branchesMissingRice: number;
  branches: CeoBranchSummary[];
};

function toNumber(value: CeoSnapshotNumber | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nullableNumber(value: CeoSnapshotNumber | undefined) {
  if (value === null || value === undefined || value === "") return null;
  return toNumber(value);
}

function percentage(current: number, baseline: number) {
  if (baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function branchIdentity(row: CeoSnapshotRow) {
  const branch = Array.isArray(row.branch) ? row.branch[0] : row.branch;
  return {
    code: branch?.code?.trim() || "ไม่ระบุรหัส",
    name: branch?.name?.trim() || branch?.code?.trim() || "ไม่ระบุสาขา",
  };
}

export function buildCeoTodaySummary(
  snapshots: CeoSnapshotRow[],
  people: CeoCompanyPeopleRow | null,
): CeoTodaySummary | null {
  if (snapshots.length === 0) return null;

  const sum = (pick: (row: CeoSnapshotRow) => CeoSnapshotNumber | undefined) =>
    snapshots.reduce((total, row) => total + toNumber(pick(row)), 0);
  const totalSales = sum((row) => row.total_sales);
  const yesterdaySales = sum((row) => row.yesterday_sales);
  const averageSales30d = sum((row) => row.average_sales_30d);
  const rowsWithPacks = snapshots.filter((row) => row.packs_sold !== null);
  const packsSold = rowsWithPacks.reduce((total, row) => total + Number(row.packs_sold ?? 0), 0);
  const chickenKgForReportedPacks = rowsWithPacks.reduce(
    (total, row) => total + toNumber(row.chicken_products_total_kg),
    0,
  );
  const riceKgForReportedPacks = rowsWithPacks.reduce(
    (total, row) => total + toNumber(row.sticky_rice_used_kg),
    0,
  );
  const cashVarianceValues = snapshots
    .map((row) => nullableNumber(row.cash_variance))
    .filter((value): value is number => value !== null);
  const laborCostValues = snapshots
    .map((row) => nullableNumber(row.labor_cost))
    .filter((value): value is number => value !== null);
  const laborCost = laborCostValues.length
    ? laborCostValues.reduce((total, value) => total + value, 0)
    : null;

  const branches = snapshots.map<CeoBranchSummary>((row) => {
    const identity = branchIdentity(row);
    return {
      branchId: row.branch_id,
      branchCode: identity.code,
      branchName: identity.name,
      totalSales: toNumber(row.total_sales),
      salesVs30dPct: nullableNumber(row.average_sales_30d)
        ? percentage(toNumber(row.total_sales), toNumber(row.average_sales_30d))
        : null,
      packsSold: row.packs_sold,
      chickenKg: toNumber(row.chicken_products_total_kg),
      chickenYield: nullableNumber(row.chicken_yield_packs_per_kg),
      riceKg: toNumber(row.sticky_rice_used_kg),
      riceYield: nullableNumber(row.rice_yield_packs_per_kg),
      staffPresent: Number(row.staff_present_count ?? 0),
      staffLate: Number(row.staff_late_count ?? 0),
      alertCount: Number(row.open_alert_count ?? 0),
    };
  });

  return {
    businessDate: snapshots[0].business_date,
    calculatedAt: snapshots
      .map((row) => row.calculated_at)
      .sort()
      .at(-1) ?? snapshots[0].calculated_at,
    branchCount: snapshots.length,
    totalSales,
    cashSales: sum((row) => row.cash_sales),
    transferSales: sum((row) => row.transfer_sales),
    yesterdaySales,
    averageSales30d,
    salesVsYesterdayPct: percentage(totalSales, yesterdaySales),
    salesVs30dPct: percentage(totalSales, averageSales30d),
    packsSold,
    packsReportedBranches: rowsWithPacks.length,
    chickenKg: sum((row) => row.chicken_products_total_kg),
    chickenYield: chickenKgForReportedPacks > 0 ? packsSold / chickenKgForReportedPacks : null,
    riceKg: sum((row) => row.sticky_rice_used_kg),
    riceYield: riceKgForReportedPacks > 0 ? packsSold / riceKgForReportedPacks : null,
    cashIn: sum((row) => row.branch_cash_in),
    cashOut: sum((row) => row.branch_cash_out),
    netCashflow: sum((row) => row.branch_net_cashflow),
    cashVariance: cashVarianceValues.length
      ? cashVarianceValues.reduce((total, value) => total + value, 0)
      : null,
    laborCost,
    laborCostPct: laborCost !== null && totalSales > 0 ? (laborCost / totalSales) * 100 : null,
    staffPresent: Number(people?.present_staff_count ?? sum((row) => row.staff_present_count)),
    staffAbsent: people?.absent_staff_count ?? null,
    staffLate: Number(people?.late_staff_count ?? sum((row) => row.staff_late_count)),
    approvedLeave: people?.approved_leave_count ?? null,
    kpiExpected: people?.kpi_expected_count ?? null,
    kpiIncomplete: people?.kpi_incomplete_count ?? null,
    complaintCount: sum((row) => row.complaint_count),
    openAlertCount: sum((row) => row.open_alert_count),
    criticalAlertCount: sum((row) => row.critical_alert_count),
    branchesAwaitingPacks: snapshots.filter((row) => row.packs_sold === null).length,
    branchesMissingRice: snapshots.filter((row) => toNumber(row.sticky_rice_used_kg) <= 0).length,
    branches,
  };
}
