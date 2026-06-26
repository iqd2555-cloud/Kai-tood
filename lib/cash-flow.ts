import type { Branch, Profile } from "@/lib/types";

export type CashFlowDirection = "in" | "out";
export type CashFlowStatus = "pending_in" | "received" | "pending_out" | "paid" | "cancelled" | "overdue";
export type CashFlowSource = "auto" | "manual";

export type CashFlowEntry = {
  id: string;
  transaction_date: string;
  due_date: string | null;
  direction: CashFlowDirection;
  status: CashFlowStatus;
  category_id: string | null;
  description: string;
  amount: number;
  money_channel_id: string | null;
  branch_id: string | null;
  source: CashFlowSource;
  source_ref: string | null;
  attachment_url: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: Pick<Branch, "name" | "code"> | null;
  profiles?: Pick<Profile, "full_name"> | null;
  cash_flow_categories?: CashFlowCategory | null;
  cash_flow_money_channels?: CashFlowMoneyChannel | null;
};

export type CashFlowCategory = {
  id: string;
  name: string;
  direction: CashFlowDirection | "both";
  sort_order: number;
  is_active: boolean;
};

export type CashFlowMoneyChannel = {
  id: string;
  name: string;
  opening_balance: number;
  is_active: boolean;
};

export const CASH_FLOW_STATUS_LABEL: Record<CashFlowStatus, string> = {
  pending_in: "รอรับ",
  received: "รับแล้ว",
  pending_out: "รอจ่าย",
  paid: "จ่ายแล้ว",
  cancelled: "ยกเลิก",
  overdue: "ค้างชำระ",
};

export const CASH_FLOW_DIRECTION_LABEL: Record<CashFlowDirection, string> = {
  in: "รับ",
  out: "จ่าย",
};

export const DEFAULT_CASH_FLOW_CATEGORIES = [
  ["ยอดขายหน้าร้าน", "in"], ["รายรับแฟรนไชส์", "in"], ["ขายวัตถุดิบให้สาขา", "in"], ["คอร์ส/หนังสือ/บริการ", "in"], ["เติมเงินเข้ากิจการ", "in"], ["รับเงินคืน", "in"],
  ["ซื้อไก่สด", "out"], ["ซื้อวัตถุดิบ", "out"], ["โรงหมัก", "out"], ["ขนส่ง", "out"], ["ค่าแรง", "out"], ["ซื้ออุปกรณ์", "out"], ["หน้าร้าน", "out"], ["ส่วนกลาง", "out"], ["ค่าเช่า", "out"], ["ค่าไฟ", "out"], ["ค่าน้ำ", "out"], ["ค่าโทรศัพท์/อินเทอร์เน็ต", "out"], ["ค่าเดินทาง", "out"], ["ค่าโฆษณา", "out"], ["ค่าซ่อมอุปกรณ์", "out"], ["จ่ายหนี้", "out"], ["ถอนเงินออกจากกิจการ", "out"], ["ค่าใช้จ่ายจิปาถะ", "out"], ["รายการอื่น ๆ", "both"],
] as const;

export const DEFAULT_CASH_FLOW_CHANNELS = ["เงินสด", "ธนาคาร", "โอน", "อื่น ๆ"] as const;

export function addDaysISO(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isActualStatus(status: CashFlowStatus) {
  return status === "received" || status === "paid";
}

export function isPendingStatus(status: CashFlowStatus) {
  return status === "pending_in" || status === "pending_out" || status === "overdue";
}
