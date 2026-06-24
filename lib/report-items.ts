import type { DailyReport } from "@/lib/types";

export const INVENTORY_FLOW_ITEMS = [
  { label: "ไก่ทอดดั้งเดิม", unit: "กิโลกรัม", opening: "opening_original_chicken", received: "received_original_chicken", used: "used_bl", remaining: "remaining_original_chicken" },
  { label: "ไก่เผ็ด", unit: "กิโลกรัม", opening: "opening_spicy_chicken", received: "received_spicy_chicken", used: "used_bb", remaining: "remaining_spicy_chicken" },
  { label: "ไก่สับ", unit: "กิโลกรัม", opening: "opening_ground_chicken", received: "received_ground_chicken", used: "used_chopped_chicken", remaining: "remaining_ground_chicken" },
  { label: "น่องไก่", unit: "กิโลกรัม", opening: "opening_drumstick", received: "received_drumstick", used: "used_drumstick", remaining: "remaining_drumstick" },
  { label: "เครื่องในไก่", unit: "กิโลกรัม", opening: "opening_offal", received: "received_offal", used: "used_offal", remaining: "remaining_offal" },
  { label: "หนังไก่", unit: "กิโลกรัม", opening: "opening_chicken_skin", received: "received_chicken_skin", used: "used_chicken_skin", remaining: "remaining_chicken_skin" },
  { label: "ข้าวเหนียว", unit: "กิโลกรัม", opening: "opening_sticky_rice", received: "received_sticky_rice", used: "used_sticky_rice", remaining: "remaining_sticky_rice" },
  { label: "น้ำมัน", unit: "กิโลกรัม", opening: "opening_oil", received: "received_oil", used: "used_oil", remaining: "remaining_oil" },
] as const;

export const OPENING_INVENTORY_ITEMS = INVENTORY_FLOW_ITEMS.map(({ label, opening: name, unit }) => ({ label, name, unit })) as readonly { label: string; name: OpeningInventoryField; unit: string }[];
export const RECEIVED_INGREDIENT_ITEMS = INVENTORY_FLOW_ITEMS.map(({ label, received: name, unit }) => ({ label, name, unit })) as readonly { label: string; name: ReceivedIngredientField; unit: string }[];
export const USED_INGREDIENT_ITEMS = INVENTORY_FLOW_ITEMS.map(({ label, used: name, unit }) => ({ label, name, unit })) as readonly { label: string; name: UsedIngredientField; unit: string }[];
export const REMAINING_INVENTORY_ITEMS = INVENTORY_FLOW_ITEMS.map(({ label, remaining: name, unit }) => ({ label: `${label}คงเหลือ`, name, unit })) as readonly { label: string; name: RemainingInventoryField; unit: string }[];

export const LEGACY_RECEIVED_INGREDIENT_ITEMS = [
  { label: "ไก่รับเข้า", name: "received_chicken", unit: "กิโลกรัม" },
] as const;


export const RECEIVED_CHICKEN_FIELDS = [
  "received_original_chicken",
  "received_spicy_chicken",
  "received_ground_chicken",
  "received_drumstick",
  "received_offal",
  "received_chicken_skin",
] as const satisfies readonly Extract<ReceivedIngredientField, (typeof INVENTORY_FLOW_ITEMS)[number]["received"]>[];

export type ReceivedChickenField = (typeof RECEIVED_CHICKEN_FIELDS)[number];
export type ChickenReceivedReport = Partial<Record<ReceivedChickenField | "received_chicken", number | string | null | undefined>>;

export function toReportNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getChickenReceivedBreakdown(report: ChickenReceivedReport) {
  return RECEIVED_CHICKEN_FIELDS.reduce<Record<ReceivedChickenField, number>>((acc, field) => {
    acc[field] = toReportNumber(report[field]);
    return acc;
  }, {} as Record<ReceivedChickenField, number>);
}

export function calculateChickenReceivedKg(report: ChickenReceivedReport) {
  const structuredTotal = Object.values(getChickenReceivedBreakdown(report)).reduce((sum, value) => sum + value, 0);
  return structuredTotal > 0 ? structuredTotal : toReportNumber(report.received_chicken);
}

export const ORDER_REQUEST_ITEMS = [
  { label: "ไก่ดั้งเดิม", name: "order_original_chicken", unit: "กิโลกรัม" },
  { label: "ไก่เผ็ด", name: "order_spicy_chicken", unit: "กิโลกรัม" },
  { label: "เครื่องในไก่", name: "order_offal", unit: "กิโลกรัม" },
  { label: "ไก่สับ", name: "order_chopped_chicken", unit: "กิโลกรัม" },
  { label: "น่องไก่", name: "order_drumstick", unit: "กิโลกรัม" },
  { label: "หนังไก่", name: "order_chicken_skin", unit: "กิโลกรัม" },
  { label: "ข้าวเหนียว", name: "order_sticky_rice", unit: "กิโลกรัม" },
  { label: "น้ำมัน", name: "order_oil", unit: "กิโลกรัม" },
  { label: "น้ำตาลปี๊บ", name: "order_palm_sugar", unit: "กิโลกรัม" },
] as const;

export type OpeningInventoryField = (typeof INVENTORY_FLOW_ITEMS)[number]["opening"];
export type ReceivedIngredientField = (typeof INVENTORY_FLOW_ITEMS)[number]["received"] | (typeof LEGACY_RECEIVED_INGREDIENT_ITEMS)[number]["name"];
export type UsedIngredientField = (typeof INVENTORY_FLOW_ITEMS)[number]["used"];
export type RemainingInventoryField = (typeof INVENTORY_FLOW_ITEMS)[number]["remaining"];
export type OrderRequestField = (typeof ORDER_REQUEST_ITEMS)[number]["name"];

export const REMAINING_CHICKEN_FIELDS = [
  "remaining_original_chicken",
  "remaining_spicy_chicken",
  "remaining_ground_chicken",
  "remaining_drumstick",
  "remaining_offal",
  "remaining_chicken_skin",
] as const satisfies readonly RemainingInventoryField[];

export type RemainingChickenField = (typeof REMAINING_CHICKEN_FIELDS)[number];
export type ChickenRemainingReport = Partial<Record<RemainingChickenField, number | string | null | undefined>>;


export const OPENING_CHICKEN_FIELDS = [
  "opening_original_chicken",
  "opening_spicy_chicken",
  "opening_ground_chicken",
  "opening_drumstick",
  "opening_offal",
  "opening_chicken_skin",
] as const satisfies readonly OpeningInventoryField[];

export type OpeningChickenField = (typeof OPENING_CHICKEN_FIELDS)[number];
export const STICKY_RICE_FIELDS = {
  opening: "opening_sticky_rice",
  received: "received_sticky_rice",
  remaining: "remaining_sticky_rice",
} as const;

export const OIL_FIELDS = {
  opening: "opening_oil",
  received: "received_oil",
  remaining: "remaining_oil",
} as const;

type IngredientNumber = number | string | null | undefined;

export type BranchIngredientSummaryReport = Partial<Record<
  | OpeningChickenField
  | ReceivedChickenField
  | RemainingChickenField
  | "received_chicken"
  | (typeof STICKY_RICE_FIELDS)[keyof typeof STICKY_RICE_FIELDS]
  | (typeof OIL_FIELDS)[keyof typeof OIL_FIELDS]
  | "branch_id"
  | "branchId"
  | "branch_name"
  | "branchName"
  | "report_date"
  | "reportDate",
  IngredientNumber
>>;

export type IngredientBreakdown = {
  opening: Record<string, number>;
  received: Record<string, number>;
  remaining: Record<string, number>;
  usedByStock: Record<string, number>;
};

export type BranchIngredientSummary = {
  branchId: string;
  branchName: string;
  reportDate: string;
  hasReport: boolean;
  chickenOpeningKg: number;
  chickenReceivedKg: number;
  chickenUsedByStockKg: number;
  chickenRemainingKg: number;
  stickyRiceOpeningKg: number;
  stickyRiceReceivedKg: number;
  stickyRiceUsedByStockKg: number;
  stickyRiceRemainingKg: number;
  oilOpeningKg: number;
  oilReceivedKg: number;
  oilUsedByStockKg: number;
  oilRemainingKg: number;
  chickenBreakdown: IngredientBreakdown;
  warnings: string[];
};

export type OverallIngredientSummary = Omit<
  BranchIngredientSummary,
  "branchId" | "branchName" | "reportDate" | "hasReport" | "warnings"
> & {
  reportBranchCount: number;
  missingBranchCount: number;
  warnings: string[];
};

export function roundIngredientNumber(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;
}

function sumReportFields<T extends string>(report: Partial<Record<T, number | string | null | undefined>>, fields: readonly T[]) {
  return fields.reduce((sum, field) => sum + toReportNumber(report[field]), 0);
}

function mapReportFields<T extends string>(report: Partial<Record<T, number | string | null | undefined>>, fields: readonly T[]) {
  return fields.reduce<Record<T, number>>((acc, field) => {
    acc[field] = roundIngredientNumber(toReportNumber(report[field]));
    return acc;
  }, {} as Record<T, number>);
}

export function getChickenOpeningBreakdown(report: BranchIngredientSummaryReport) {
  return mapReportFields(report, OPENING_CHICKEN_FIELDS);
}

export function getChickenRemainingBreakdown(report: BranchIngredientSummaryReport) {
  return mapReportFields(report, REMAINING_CHICKEN_FIELDS);
}

function makeUsedByStockBreakdown(opening: Record<string, number>, received: Record<string, number>, remaining: Record<string, number>) {
  return Object.keys(opening).reduce<Record<string, number>>((acc, field) => {
    acc[field] = roundIngredientNumber((opening[field] ?? 0) + (received[field.replace("opening_", "received_")] ?? 0) - (remaining[field.replace("opening_", "remaining_")] ?? 0));
    return acc;
  }, {});
}

export function calculateBranchIngredientSummary(report: BranchIngredientSummaryReport = {}, options: { branchId?: string; branchName?: string; reportDate?: string; hasReport?: boolean } = {}): BranchIngredientSummary {
  const hasReport = options.hasReport ?? Object.keys(report).length > 0;
  const branchId = String(options.branchId ?? report.branchId ?? report.branch_id ?? "");
  const branchName = String(options.branchName ?? report.branchName ?? report.branch_name ?? "ไม่ระบุสาขา");
  const reportDate = String(options.reportDate ?? report.reportDate ?? report.report_date ?? "");
  const chickenOpeningBreakdown = getChickenOpeningBreakdown(report);
  const chickenReceivedBreakdown = getChickenReceivedBreakdown(report);
  const chickenRemainingBreakdown = getChickenRemainingBreakdown(report);
  const chickenOpeningKg = roundIngredientNumber(sumReportFields(report, OPENING_CHICKEN_FIELDS));
  const chickenReceivedKg = roundIngredientNumber(Object.values(chickenReceivedBreakdown).reduce((sum, value) => sum + value, 0));
  const chickenRemainingKg = roundIngredientNumber(sumReportFields(report, REMAINING_CHICKEN_FIELDS));
  const stickyRiceOpeningKg = roundIngredientNumber(toReportNumber(report.opening_sticky_rice));
  const stickyRiceReceivedKg = roundIngredientNumber(toReportNumber(report.received_sticky_rice));
  const stickyRiceRemainingKg = roundIngredientNumber(toReportNumber(report.remaining_sticky_rice));
  const oilOpeningKg = roundIngredientNumber(toReportNumber(report.opening_oil));
  const oilReceivedKg = roundIngredientNumber(toReportNumber(report.received_oil));
  const oilRemainingKg = roundIngredientNumber(toReportNumber(report.remaining_oil));
  const warnings: string[] = [];

  if (!hasReport) warnings.push("ไม่มีรายงาน");
  if (toReportNumber(report.received_chicken) > 0 && chickenReceivedKg === 0) warnings.push("พบเฉพาะ field เก่า received_chicken แต่ไม่มีรับเข้าไก่แยกประเภท จึงไม่รวมเป็นกลุ่มไก่");

  return {
    branchId,
    branchName,
    reportDate,
    hasReport,
    chickenOpeningKg,
    chickenReceivedKg,
    chickenRemainingKg,
    chickenUsedByStockKg: roundIngredientNumber(chickenOpeningKg + chickenReceivedKg - chickenRemainingKg),
    stickyRiceOpeningKg,
    stickyRiceReceivedKg,
    stickyRiceRemainingKg,
    stickyRiceUsedByStockKg: roundIngredientNumber(stickyRiceOpeningKg + stickyRiceReceivedKg - stickyRiceRemainingKg),
    oilOpeningKg,
    oilReceivedKg,
    oilRemainingKg,
    oilUsedByStockKg: roundIngredientNumber(oilOpeningKg + oilReceivedKg - oilRemainingKg),
    chickenBreakdown: {
      opening: chickenOpeningBreakdown,
      received: chickenReceivedBreakdown,
      remaining: chickenRemainingBreakdown,
      usedByStock: makeUsedByStockBreakdown(chickenOpeningBreakdown, chickenReceivedBreakdown, chickenRemainingBreakdown),
    },
    warnings,
  };
}

export function calculateOverallIngredientSummary(branchSummaries: BranchIngredientSummary[]): OverallIngredientSummary {
  const reportSummaries = branchSummaries.filter((summary) => summary.hasReport);
  const sum = (key: keyof Pick<BranchIngredientSummary, "chickenOpeningKg" | "chickenReceivedKg" | "chickenUsedByStockKg" | "chickenRemainingKg" | "stickyRiceOpeningKg" | "stickyRiceReceivedKg" | "stickyRiceUsedByStockKg" | "stickyRiceRemainingKg" | "oilOpeningKg" | "oilReceivedKg" | "oilUsedByStockKg" | "oilRemainingKg">) =>
    roundIngredientNumber(reportSummaries.reduce((total, summary) => total + summary[key], 0));

  return {
    chickenOpeningKg: sum("chickenOpeningKg"),
    chickenReceivedKg: sum("chickenReceivedKg"),
    chickenUsedByStockKg: sum("chickenUsedByStockKg"),
    chickenRemainingKg: sum("chickenRemainingKg"),
    stickyRiceOpeningKg: sum("stickyRiceOpeningKg"),
    stickyRiceReceivedKg: sum("stickyRiceReceivedKg"),
    stickyRiceUsedByStockKg: sum("stickyRiceUsedByStockKg"),
    stickyRiceRemainingKg: sum("stickyRiceRemainingKg"),
    oilOpeningKg: sum("oilOpeningKg"),
    oilReceivedKg: sum("oilReceivedKg"),
    oilUsedByStockKg: sum("oilUsedByStockKg"),
    oilRemainingKg: sum("oilRemainingKg"),
    chickenBreakdown: { opening: {}, received: {}, remaining: {}, usedByStock: {} },
    reportBranchCount: reportSummaries.length,
    missingBranchCount: branchSummaries.length - reportSummaries.length,
    warnings: branchSummaries.flatMap((summary) => summary.warnings.map((warning) => `${summary.branchName}: ${warning}`)),
  };
}

export function calculateChickenRemainingKg(report: ChickenRemainingReport) {
  return REMAINING_CHICKEN_FIELDS.reduce((sum, field) => sum + toReportNumber(report[field]), 0);
}

export const getRemainingChickenTotal = calculateChickenRemainingKg;

export function getCalculatedRemaining(report: DailyReport, item: (typeof INVENTORY_FLOW_ITEMS)[number]) {
  return Number(report[item.opening] ?? 0) + Number(report[item.received] ?? 0) - Number(report[item.used] ?? 0);
}

export function getInventoryDifference(report: DailyReport, item: (typeof INVENTORY_FLOW_ITEMS)[number]) {
  return Number(report[item.remaining] ?? 0) - getCalculatedRemaining(report, item);
}

export function formatStructuredOrderItems(report: Pick<DailyReport, OrderRequestField | "requested_items" | "order_other_items">) {
  const lines = ORDER_REQUEST_ITEMS
    .map((item) => {
      const value = Number(report[item.name] ?? 0);
      if (value <= 0) return null;
      return `${item.label}: ${value.toLocaleString("th-TH")} ${item.unit}`;
    })
    .filter(Boolean);

  const otherItems = Array.isArray(report.order_other_items)
    ? report.order_other_items
        .map((item) => {
          const name = String(item?.name ?? "").trim();
          const amount = Number(item?.amount ?? 0);
          if (!name || amount <= 0) return null;
          return `${name}: ${amount.toLocaleString("th-TH")}`;
        })
        .filter(Boolean)
    : [];

  const allLines = [...lines, ...otherItems];
  return allLines.length > 0 ? allLines.join("\n") : report.requested_items ?? "";
}
