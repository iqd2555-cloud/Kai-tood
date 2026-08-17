export type ProductCode = "original" | "spicy" | "skin" | "offal" | "drumstick";
export type CustomerGroup = "A" | "B" | "C";

export const MARINATED_PRODUCTS: Record<ProductCode, { name: string; aliases: string[] }> = {
  original: { name: "ไก่ดั้งเดิม", aliases: ["ไก่ดั้งเดิม", "ดั้งเดิม", "ดังเดิม", "ดั่งเดิม", "เดิม"] },
  spicy: { name: "ไก่ทอดพริก", aliases: ["ไก่ทอดพริก", "ทอดพริก", "ไก่พริก", "ไก่เผ็ด", "พริก", "เผ็ด"] },
  skin: { name: "หนังไก่", aliases: ["หนังไก่", "หนัง"] },
  offal: { name: "เครื่องใน", aliases: ["เครื่องใน", "ตับ"] },
  drumstick: { name: "น่อง", aliases: ["น่องไก่", "น่อง"] },
};

export const GROUP_PRICE_PER_KG: Record<CustomerGroup, number> = { A: 65, B: 68, C: 70 };
export const FREE_SHIPPING_MIN_KG = 45;
export const MAX_KG_PER_BOX = 50;

export type CustomerMaster = {
  id: string;
  name: string;
  group?: CustomerGroup;
  phone?: string;
  address?: string;
  shippingInstruction?: string;
  allowDrumstick?: boolean;
  ownDelivery?: boolean;
};

export const CUSTOMER_MASTER: CustomerMaster[] = [
  { id: "gap", name: "คุณแก๊ป", phone: "0614912753", address: "ตลาดสะพานดำ นครสวรรค์", shippingInstruction: "ทางร้านจัดส่งเอง", allowDrumstick: true, ownDelivery: true },
  { id: "jintanee", name: "จินตณี ซิ้วเฉี้ยง", phone: "0642933608 / 0612621388", address: "หน้าร้านล้างรถหยอดเหรียญ MT Car Wash ถนนนวลแก้ว 84 ถนนนวลแก้วอุทิศ ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา 90110", shippingInstruction: "ขนส่งม่วงทองเท่านั้น" },
  { id: "pongthep", name: "คุณพงษ์เทพ", phone: "0979527973", address: "พื้นที่เช่าริมถนนหน้าโรงเรียนมหรรณพาราม แขวงฉิมพลี เขตตลิ่งชัน กรุงเทพฯ" },
  { id: "nongnuch", name: "นงนุช จันทร์แย้ม", group: "A", phone: "0822035782", address: "79/192 ม.11 มบ.เอ็มวินเลจ บางปะกง ฉะเชิงเทรา 24130", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "hiranya", name: "หิรัญญา ภักดีเมือง", group: "B", phone: "0833953863", address: "103 ม.2 ต.ปากหมาก อ.ไชยา จ.สุราษฎร์ธานี 84110", shippingInstruction: "ขนส่ง ส.สวัสดิ์ — ลงที่หน้าสหกรณ์ไชยา" },
  { id: "kwan", name: "ขวัญ", phone: "0994309339", address: "83/3 ซอยงามวงศ์วาน 64 ถนนงามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900" },
  { id: "winai", name: "วินัย เกาะแก้ว", phone: "0938684493", address: "6/4 หมู่ 12 ต.ทองเอน อ.อินทร์บุรี จ.สิงห์บุรี 16110", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "patcharee", name: "พัชรี แสงขันทอง", phone: "0617537380", address: "374/1 ม.8 ต.เขาใหญ่ อ.ชะอำ จ.เพชรบุรี 76120", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "bangsu", name: "คุณบังซู", group: "C", phone: "0948949704", address: "20/39 รัชดา 36 แขวงจันทรเกษม เขตจตุจักร กรุงเทพฯ 10900" },
];

export type ParsedItem = { product: ProductCode; name: string; kg: number; source: string };
export type ParseResult = {
  items: ParsedItem[];
  totalKg: number;
  warnings: string[];
  needsReview: boolean;
};

function normalize(text: string) {
  return text.replace(/ก\.ก\.?/g, "กก").replace(/กิโลกรัม|กิโล|โล/g, "กก").replace(/\s+/g, " ").trim();
}

export function parseMarinatedOrder(raw: string, customer?: CustomerMaster): ParseResult {
  const text = normalize(raw);
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  const usedRanges: Array<[number, number]> = [];

  const aliases = (Object.entries(MARINATED_PRODUCTS) as [ProductCode, (typeof MARINATED_PRODUCTS)[ProductCode]][])
    .flatMap(([product, def]) => def.aliases.map((alias) => ({ product, name: def.name, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const entry of aliases) {
    const escaped = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escaped}\\s*[:=]?\\s*(\\d+(?:\\.\\d+)?)\\s*(?:กก)?`, "gi");
    for (const match of text.matchAll(regex)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (usedRanges.some(([s, e]) => start < e && end > s)) continue;
      const kg = Number(match[1]);
      if (!Number.isFinite(kg) || kg <= 0) continue;
      if (entry.product === "drumstick" && !customer?.allowDrumstick) {
        warnings.push("พบรายการน่อง แต่ลูกค้ารายนี้ไม่ได้รับสิทธิ์สั่งน่อง");
        continue;
      }
      items.push({ product: entry.product, name: entry.name, kg, source: match[0] });
      usedRanges.push([start, end]);
    }
  }

  // คำว่า “ไก่” เดี่ยว ๆ มีความกำกวม จึงไม่ map เป็นดั้งเดิมอัตโนมัติ
  if (/(?:^|\s)ไก่\s*\d+/i.test(text) && !items.some((item) => item.product === "original")) {
    warnings.push("พบคำว่า ‘ไก่’ พร้อมจำนวน แต่ไม่ชัดว่าเป็นไก่ดั้งเดิม ต้องตรวจสอบ");
  }

  const merged = new Map<ProductCode, ParsedItem>();
  for (const item of items) {
    const existing = merged.get(item.product);
    if (existing) existing.kg += item.kg;
    else merged.set(item.product, { ...item });
  }
  const finalItems = [...merged.values()];
  const totalKg = finalItems.reduce((sum, item) => sum + item.kg, 0);
  if (totalKg > 0 && totalKg < FREE_SHIPPING_MIN_KG && !customer?.ownDelivery) warnings.push(`ยอดรวม ${totalKg} กก. ต่ำกว่าเกณฑ์ส่งฟรี ${FREE_SHIPPING_MIN_KG} กก.`);
  const boxes = totalKg > 0 ? Math.ceil(totalKg / MAX_KG_PER_BOX) : 0;
  if (boxes > 1) warnings.push(`น้ำหนักรวมต้องจัดอย่างน้อย ${boxes} ลัง (ไม่เกิน ${MAX_KG_PER_BOX} กก./ลัง)`);

  return { items: finalItems, totalKg, warnings, needsReview: warnings.length > 0 || finalItems.length === 0 };
}

export function priceOrder(result: ParseResult, customer: CustomerMaster) {
  if (!customer.group) return { pricePerKg: null, total: null, warning: "ยังไม่ระบุกลุ่มราคา A/B/C ของลูกค้า" };
  const pricePerKg = GROUP_PRICE_PER_KG[customer.group];
  return { pricePerKg, total: result.totalKg * pricePerKg, warning: null };
}
