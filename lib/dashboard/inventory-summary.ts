const EXCLUDED_BRANCH_NAMES = ["สาขาหลัก"];
const EXCLUDED_BRANCH_CODES = ["MAIN", "DEFAULT", "MAIN_BRANCH"];

function normalizeBranchText(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

function isReportableDashboardBranch(branch: DashboardBranch | null | undefined) {
  if (!branch) return false;
  if (branch.is_active === false) return false;
  const normalizedName = normalizeBranchText(branch.name);
  const normalizedCode = normalizeBranchText(branch.code);
  return !EXCLUDED_BRANCH_NAMES.some((name) => normalizeBranchText(name) === normalizedName) && !EXCLUDED_BRANCH_CODES.includes(normalizedCode);
}

export type DashboardStatus = "normal" | "warning" | "critical" | "no_report";
export type DashboardNumber = number | string | null | undefined;
export type DashboardReport = Record<string, unknown> & {
  id?: string;
  report_date?: string;
  branch_id?: string;
  branch_name?: string;
  cash_sales?: DashboardNumber;
  transfer_sales?: DashboardNumber;
  total_sales?: DashboardNumber;
  updated_at?: string | null;
  created_at?: string | null;
};
export type DashboardBranch = { id: string; name?: string | null; code?: string | null; is_active?: boolean | null };

export type BranchDashboardSummary = {
  branchId: string;
  branchName: string;
  reportDate: string;
  hasReport: boolean;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  chickenOpeningKg: number;
  chickenReceivedKg: number;
  chickenUsedByStockKg: number;
  chickenRemainingKg: number;
  salesPerChickenKg: number | null;
  stickyRiceOpeningKg: number;
  stickyRiceReceivedKg: number;
  stickyRiceUsedByStockKg: number;
  stickyRiceRemainingKg: number;
  oilOpeningKg: number;
  oilReceivedKg: number;
  oilUsedByStockKg: number;
  oilRemainingKg: number;
  chickenBreakdown: {
    opening: Record<string, number>;
    received: Record<string, number>;
    remaining: Record<string, number>;
    usedByStock: Record<string, number>;
  };
  status: DashboardStatus;
  warnings: string[];
};

export type OverallDashboardSummary = {
  reportDate: string;
  totalSales: number;
  cashSales: number;
  transferSales: number;
  chickenOpeningKg: number;
  chickenReceivedKg: number;
  chickenUsedByStockKg: number;
  chickenRemainingKg: number;
  salesPerChickenKg: number | null;
  stickyRiceUsedByStockKg: number;
  oilUsedByStockKg: number;
  branchSummaries: BranchDashboardSummary[];
  activeBranchesCount: number;
  reportedBranchesCount: number;
  missingReportBranches: string[];
  warnings: string[];
};

const CHICKEN_ITEM_FIELDS = [
  ["ไก่ทอดดั้งเดิม", "original_chicken"],
  ["ไก่เผ็ด", "spicy_chicken"],
  ["ไก่สับ", "ground_chicken"],
  ["น่องไก่", "drumstick"],
  ["เครื่องในไก่", "offal"],
  ["หนังไก่", "chicken_skin"],
] as const;

type ChickenGroup = "opening" | "received" | "remaining";

export function toNumberSafe(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function roundKg(value: unknown): number {
  return Math.round(toNumberSafe(value) * 10) / 10;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function chickenField(group: ChickenGroup, suffix: string) {
  return `${group}_${suffix}`;
}

function chickenBreakdown(report: DashboardReport | undefined, group: ChickenGroup): Record<string, number> {
  return CHICKEN_ITEM_FIELDS.reduce<Record<string, number>>((acc, [label, suffix]) => {
    acc[label] = roundKg(report?.[chickenField(group, suffix)]);
    return acc;
  }, {});
}

export function sumChickenItems(report: DashboardReport | undefined, group: ChickenGroup): number {
  return roundKg(Object.values(chickenBreakdown(report, group)).reduce((sum, value) => sum + value, 0));
}

function usedByStockBreakdown(opening: Record<string, number>, received: Record<string, number>, remaining: Record<string, number>) {
  return CHICKEN_ITEM_FIELDS.reduce<Record<string, number>>((acc, [label]) => {
    acc[label] = roundKg((opening[label] ?? 0) + (received[label] ?? 0) - (remaining[label] ?? 0));
    return acc;
  }, {});
}

export function calculateBranchDashboardSummary(report: DashboardReport | null | undefined, branch: DashboardBranch, reportDate = report?.report_date ?? ""): BranchDashboardSummary {
  const hasReport = Boolean(report);
  const branchName = branch.name?.trim() || branch.code?.trim() || report?.branch_name || "ไม่ระบุสาขา";
  const cashSales = hasReport ? toNumberSafe(report?.cash_sales) : 0;
  const transferSales = hasReport ? toNumberSafe(report?.transfer_sales) : 0;
  const totalSales = hasReport ? (toNumberSafe(report?.total_sales) || cashSales + transferSales) : 0;
  const opening = chickenBreakdown(report ?? undefined, "opening");
  const received = chickenBreakdown(report ?? undefined, "received");
  const remaining = chickenBreakdown(report ?? undefined, "remaining");
  const chickenOpeningKg = hasReport ? sumChickenItems(report ?? undefined, "opening") : 0;
  const chickenReceivedKg = hasReport ? sumChickenItems(report ?? undefined, "received") : 0;
  const chickenRemainingKg = hasReport ? sumChickenItems(report ?? undefined, "remaining") : 0;
  const chickenUsedByStockKg = hasReport ? roundKg(chickenOpeningKg + chickenReceivedKg - chickenRemainingKg) : 0;
  const stickyRiceOpeningKg = hasReport ? roundKg(report?.opening_sticky_rice) : 0;
  const stickyRiceReceivedKg = hasReport ? roundKg(report?.received_sticky_rice) : 0;
  const stickyRiceRemainingKg = hasReport ? roundKg(report?.remaining_sticky_rice) : 0;
  const oilOpeningKg = hasReport ? roundKg(report?.opening_oil) : 0;
  const oilReceivedKg = hasReport ? roundKg(report?.received_oil) : 0;
  const oilRemainingKg = hasReport ? roundKg(report?.remaining_oil) : 0;
  const warnings: string[] = [];
  if (!hasReport) warnings.push("ไม่มีรายงาน");
  if (hasReport && chickenUsedByStockKg < 0) warnings.push("ไก่ใช้ไปตามสต๊อกติดลบ กรุณาตรวจสอบยอดยกมา รับเข้า และคงเหลือ");
  if (hasReport && totalSales > 0 && chickenUsedByStockKg <= 0) warnings.push("มียอดขายแต่ไม่มีไก่ใช้ไปตามสต๊อก");
  const status: DashboardStatus = !hasReport ? "no_report" : warnings.some((warning) => warning.includes("ติดลบ") || warning.includes("มียอดขาย")) ? "critical" : warnings.length > 0 ? "warning" : "normal";

  return {
    branchId: branch.id,
    branchName,
    reportDate: String(reportDate || ""),
    hasReport,
    totalSales,
    cashSales,
    transferSales,
    chickenOpeningKg,
    chickenReceivedKg,
    chickenUsedByStockKg,
    chickenRemainingKg,
    salesPerChickenKg: safeRatio(totalSales, chickenUsedByStockKg),
    stickyRiceOpeningKg,
    stickyRiceReceivedKg,
    stickyRiceUsedByStockKg: hasReport ? roundKg(stickyRiceOpeningKg + stickyRiceReceivedKg - stickyRiceRemainingKg) : 0,
    stickyRiceRemainingKg,
    oilOpeningKg,
    oilReceivedKg,
    oilUsedByStockKg: hasReport ? roundKg(oilOpeningKg + oilReceivedKg - oilRemainingKg) : 0,
    oilRemainingKg,
    chickenBreakdown: { opening, received, remaining, usedByStock: usedByStockBreakdown(opening, received, remaining) },
    status,
    warnings,
  };
}

export function calculateOverallDashboardSummary(branchSummaries: BranchDashboardSummary[], reportDate = branchSummaries[0]?.reportDate ?? ""): OverallDashboardSummary {
  const reported = branchSummaries.filter((summary) => summary.hasReport);
  const sum = (key: keyof Pick<BranchDashboardSummary, "totalSales" | "cashSales" | "transferSales" | "chickenOpeningKg" | "chickenReceivedKg" | "chickenUsedByStockKg" | "chickenRemainingKg" | "stickyRiceUsedByStockKg" | "oilUsedByStockKg">) =>
    roundKg(reported.reduce((total, summary) => total + summary[key], 0));
  const totalSales = sum("totalSales");
  const chickenUsedByStockKg = sum("chickenUsedByStockKg");
  return {
    reportDate,
    totalSales,
    cashSales: sum("cashSales"),
    transferSales: sum("transferSales"),
    chickenOpeningKg: sum("chickenOpeningKg"),
    chickenReceivedKg: sum("chickenReceivedKg"),
    chickenUsedByStockKg,
    chickenRemainingKg: sum("chickenRemainingKg"),
    salesPerChickenKg: safeRatio(totalSales, chickenUsedByStockKg),
    stickyRiceUsedByStockKg: sum("stickyRiceUsedByStockKg"),
    oilUsedByStockKg: sum("oilUsedByStockKg"),
    branchSummaries,
    activeBranchesCount: branchSummaries.length,
    reportedBranchesCount: reported.length,
    missingReportBranches: branchSummaries.filter((summary) => !summary.hasReport).map((summary) => summary.branchName),
    warnings: branchSummaries.flatMap((summary) => summary.warnings.map((warning) => `${summary.branchName}: ${warning}`)),
  };
}

function latestTimestamp(report: DashboardReport) {
  return String(report.updated_at || report.created_at || "");
}

export function normalizeDashboardReports(reports: DashboardReport[], branches: DashboardBranch[], reportDate: string): BranchDashboardSummary[] {
  const activeBranches = branches.filter(isReportableDashboardBranch);
  const reportsByBranch = new Map<string, DashboardReport>();
  const duplicateBranches = new Set<string>();
  for (const report of reports) {
    const branchId = String(report.branch_id ?? "");
    const current = reportsByBranch.get(branchId);
    if (current) duplicateBranches.add(branchId);
    if (!current || latestTimestamp(report) > latestTimestamp(current)) reportsByBranch.set(branchId, report);
  }
  if (process.env.NODE_ENV === "development" && duplicateBranches.size > 0) {
    console.warn("owner_dashboard_duplicate_daily_reports", { reportDate, branchIds: [...duplicateBranches] });
  }
  return activeBranches.map((branch) => calculateBranchDashboardSummary(reportsByBranch.get(branch.id), branch, reportDate));
}
