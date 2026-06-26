import type { Branch, Profile } from "@/lib/types";

export type CashFlowType = "income" | "expense";
export type CashFlowStatus = "pending_receive" | "received" | "pending_pay" | "paid" | "cancelled" | "overdue";
export type CashFlowSource = "manual" | "sales" | "stock" | "marinade" | "franchise" | "other";

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
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Pick<Branch, "name" | "code"> | null;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type CashFlowCategory = { id: string; name: string; direction: CashFlowType | "both"; sort_order: number; is_active: boolean };
export type CashFlowMoneyChannel = { id: string; name: string; opening_balance: number; is_active: boolean };

export const CASH_FLOW_STATUS_LABEL: Record<CashFlowStatus, string> = {
  pending_receive: "รอรับ",
  received: "รับแล้ว",
  pending_pay: "รอจ่าย",
  paid: "จ่ายแล้ว",
  cancelled: "ยกเลิก",
  overdue: "ค้างชำระ",
};

export const CASH_FLOW_TYPE_LABEL: Record<CashFlowType, string> = { income: "รับ", expense: "จ่าย" };
export const CASH_FLOW_SOURCE_LABEL: Record<CashFlowSource, string> = { manual: "บันทึกเอง", sales: "ยอดขาย", stock: "สต็อก", marinade: "โรงหมัก", franchise: "แฟรนไชส์", other: "อื่น ๆ" };

export const DEFAULT_CASH_FLOW_CATEGORIES = [
  ["ยอดขายหน้าร้าน", "income"], ["รายรับแฟรนไชส์", "income"], ["ขายวัตถุดิบให้สาขา", "income"], ["คอร์ส/หนังสือ/บริการ", "income"], ["เติมเงินเข้ากิจการ", "income"], ["รับเงินคืน", "income"],
  ["ซื้อไก่สด", "expense"], ["ซื้อวัตถุดิบ", "expense"], ["โรงหมัก", "expense"], ["ขนส่ง", "expense"], ["ค่าแรง", "expense"], ["ซื้ออุปกรณ์", "expense"], ["หน้าร้าน", "expense"], ["ส่วนกลาง", "expense"], ["ค่าเช่า", "expense"], ["ค่าไฟ", "expense"], ["ค่าน้ำ", "expense"], ["ค่าโทรศัพท์/อินเทอร์เน็ต", "expense"], ["ค่าเดินทาง", "expense"], ["ค่าโฆษณา", "expense"], ["ค่าซ่อมอุปกรณ์", "expense"], ["จ่ายหนี้", "expense"], ["ถอนเงินออกจากกิจการ", "expense"], ["ค่าใช้จ่ายจิปาถะ", "expense"], ["รายการอื่น ๆ", "both"],
] as const;

export const DEFAULT_CASH_FLOW_CHANNELS = ["เงินสด", "ธนาคาร", "โอน", "อื่น ๆ"] as const;

export function addDaysISO(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isActualStatus(status: CashFlowStatus) { return status === "received" || status === "paid"; }
export function isPendingStatus(status: CashFlowStatus) { return status === "pending_receive" || status === "pending_pay" || status === "overdue"; }
