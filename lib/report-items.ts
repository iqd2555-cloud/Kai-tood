import type { DailyReport } from "@/lib/types";

export const USED_INGREDIENT_ITEMS = [
  { label: "ไก่ทอดดั้งเดิม", name: "used_bl", unit: "กิโลกรัม" },
  { label: "ไก่เผ็ด", name: "used_bb", unit: "กิโลกรัม" },
  { label: "เครื่องในไก่", name: "used_oil", unit: "กิโลกรัม" },
  { label: "ไก่สับ", name: "used_chopped_chicken", unit: "กิโลกรัม" },
  { label: "น่องไก่", name: "used_drumstick", unit: "กิโลกรัม" },
  { label: "หนังไก่", name: "used_chicken_skin", unit: "กิโลกรัม" },
  { label: "ข้าวเหนียว", name: "used_sticky_rice", unit: "กิโลกรัม" },
] as const;

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

export type UsedIngredientField = (typeof USED_INGREDIENT_ITEMS)[number]["name"];
export type OrderRequestField = (typeof ORDER_REQUEST_ITEMS)[number]["name"];

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
