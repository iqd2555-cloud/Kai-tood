import type { Branch, Profile } from "@/lib/types";

export type CashFlowType = "income" | "expense";
export type CashFlowStatus = "pending_receive" | "received" | "pending_pay" | "paid" | "cancelled" | "overdue";
export type CashFlowSource = "manual" | "sales" | "purchase" | "franchise" | "course" | "stock" | "marinade" | "other";
export type CashFlowDocumentType = "receipt" | "tax_invoice" | "transfer_slip" | "cash_bill" | "no_document" | "other";

export type CashFlowEntry = {
  id: string;
  transaction_date: string;
  due_date: string | null;
  type: CashFlowType;
  status: CashFlowStatus;
  category: string | null;
  description: string;
  amount: number;
  payment_method: string | null;
  branch_id: string | null;
  department: string | null;
  source: CashFlowSource;
  source_ref_id: string | null;
  attachment_url: string | null;
  document_type: CashFlowDocumentType | null;
  accountant_note: string | null;
  has_attachment: boolean | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Pick<Branch, "name" | "code"> | null;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type CashFlowCategory = { id: string; name: string; type: CashFlowType; code: string | null; is_active: boolean };

export type CashFlowSummary = {
  selectedDate: string;
  filterStartDate: string;
  filterEndDate: string;
  todayIncome: number;
  todayExpense: number;
  todayNetCash: number;
  todayCash: number;
  rangeIncome: number;
  rangeExpense: number;
  rangeNetCash: number;
};

function isISODateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function cashFlowAmount(entry: CashFlowEntry) {
  const amount = Number(entry.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function cashFlowTransactionDate(entry: CashFlowEntry) {
  return isISODateOnly(entry.transaction_date) ? entry.transaction_date : "";
}

export function calculateCashFlowSummary(entries: CashFlowEntry[], selectedDate: string, filterStartDate: string, filterEndDate: string): CashFlowSummary {
  const normalizedSelectedDate = isISODateOnly(selectedDate) ? selectedDate : "";
  const normalizedFilterStartDate = isISODateOnly(filterStartDate) ? filterStartDate : normalizedSelectedDate;
  const normalizedFilterEndDate = isISODateOnly(filterEndDate) ? filterEndDate : normalizedSelectedDate;
  const sumMatching = (predicate: (entry: CashFlowEntry) => boolean) => entries.reduce((total, entry) => total + (predicate(entry) ? cashFlowAmount(entry) : 0), 0);
  const isOnSelectedDate = (entry: CashFlowEntry) => normalizedSelectedDate !== "" && cashFlowTransactionDate(entry) === normalizedSelectedDate;
  const isInFilterRange = (entry: CashFlowEntry) => {
    const transactionDate = cashFlowTransactionDate(entry);
    return transactionDate !== "" && transactionDate >= normalizedFilterStartDate && transactionDate <= normalizedFilterEndDate;
  };
  const todayIncome = sumMatching((entry) => entry.type === "income" && entry.status === "received" && isOnSelectedDate(entry));
  const todayExpense = sumMatching((entry) => entry.type === "expense" && entry.status === "paid" && isOnSelectedDate(entry));
  const rangeIncome = sumMatching((entry) => entry.type === "income" && entry.status === "received" && isInFilterRange(entry));
  const rangeExpense = sumMatching((entry) => entry.type === "expense" && entry.status === "paid" && isInFilterRange(entry));

  return {
    selectedDate: normalizedSelectedDate,
    filterStartDate: normalizedFilterStartDate,
    filterEndDate: normalizedFilterEndDate,
    todayIncome,
    todayExpense,
    todayNetCash: todayIncome - todayExpense,
    todayCash: todayIncome - todayExpense,
    rangeIncome,
    rangeExpense,
    rangeNetCash: rangeIncome - rangeExpense,
  };
}

export const CASH_FLOW_STATUS_LABEL: Record<CashFlowStatus, string> = {
  pending_receive: "รอรับ",
  received: "รับแล้ว",
  pending_pay: "รอจ่าย",
  paid: "จ่ายแล้ว",
  cancelled: "ยกเลิก",
  overdue: "ค้างชำระ",
};

export const CASH_FLOW_TYPE_LABEL: Record<CashFlowType, string> = { income: "รับ", expense: "จ่าย" };
export const CASH_FLOW_SOURCE_LABEL: Record<CashFlowSource, string> = { manual: "manual", sales: "sales", purchase: "purchase", franchise: "franchise", course: "course", stock: "stock", marinade: "marinade", other: "other" };
export const CASH_FLOW_DOCUMENT_TYPE_LABEL: Record<CashFlowDocumentType, string> = { receipt: "ใบเสร็จ", tax_invoice: "ใบกำกับภาษี", transfer_slip: "สลิปโอน", cash_bill: "บิลเงินสด", no_document: "ไม่มีเอกสาร", other: "อื่น ๆ" };


export function addDaysISO(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isActualStatus(status: CashFlowStatus) { return status === "received" || status === "paid"; }
export function isPendingStatus(status: CashFlowStatus) { return status === "pending_receive" || status === "pending_pay" || status === "overdue"; }
