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

export function getRemainingChickenTotal(report: Pick<DailyReport, RemainingChickenField>) {
  return REMAINING_CHICKEN_FIELDS.reduce((sum, field) => sum + Number(report[field] ?? 0), 0);
}

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
