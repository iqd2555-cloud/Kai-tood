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
  { label: "กระดาษห่อ", name: "order_wrapping_paper", unit: "ปึก" },
  { label: "ถุงหูหิ้ว", name: "order_plastic_bag", unit: "แพ็ค" },
  { label: "ผงเขย่ารสต้มยำ", name: "order_tom_yum_powder", unit: "ห่อ" },
  { label: "ผงเขย่ารสชีส", name: "order_cheese_powder", unit: "ห่อ" },
  { label: "ผงเขย่ารสปาปริก้า", name: "order_paprika_powder", unit: "ห่อ" },
  { label: "ผงเขย่ารสวิงส์แซ่บ", name: "order_wing_zabb_powder", unit: "ห่อ" },
  { label: "ผงเขย่ารสฮอตแอนด์สไปซี่", name: "order_hot_spicy_powder", unit: "ห่อ" },
] as const;

export type UsedIngredientField = (typeof USED_INGREDIENT_ITEMS)[number]["name"];
export type OrderRequestField = (typeof ORDER_REQUEST_ITEMS)[number]["name"];

export function formatStructuredOrderItems(report: Pick<DailyReport, OrderRequestField | "requested_items">) {
  const lines = ORDER_REQUEST_ITEMS
    .map((item) => {
      const value = Number(report[item.name] ?? 0);
      if (value <= 0) return null;
      return `${item.label}: ${value.toLocaleString("th-TH")} ${item.unit}`;
    })
    .filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : report.requested_items ?? "";
}
