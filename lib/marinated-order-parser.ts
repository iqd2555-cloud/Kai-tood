export type ProductCode = "original" | "spicy" | "skin" | "offal" | "drumstick";
export type CustomerGroup = "A" | "B" | "C";

export const MARINATED_PRODUCTS: Record<ProductCode, { name: string; aliases: string[] }> = {
  original: { name: "ไก่ดั้งเดิม", aliases: ["ไก่ดั้งเดิม", "ดั้งเดิม", "ดั้งงเดิม", "ดังเดิม", "ดั่งเดิม", "เดิม"] },
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
  group: CustomerGroup;
  phone?: string;
  address?: string;
  shippingInstruction?: string;
  allowDrumstick?: boolean;
  ownDelivery?: boolean;
};

// กลุ่ม A/B/C อ้างอิงจากชุดข้อมูลที่ผู้ใช้ส่งมาเป็นชุด ๆ:
// ชุดแรก = A, ชุดถัดมา = B, คุณบังซู = C
export const CUSTOMER_MASTER: CustomerMaster[] = [
  { id: "gap", name: "คุณแก๊ป", group: "A", phone: "0614912753", address: "ตลาดสะพานดำ นครสวรรค์", shippingInstruction: "ทางร้านจัดส่งเอง", allowDrumstick: true, ownDelivery: true },
  { id: "jintanee", name: "จินตณี ซิ้วเฉี้ยง", group: "A", phone: "0642933608 / 0612621388", address: "หน้าร้านล้างรถหยอดเหรียญ MT Car Wash ถนนนวลแก้ว 84 ถนนนวลแก้วอุทิศ ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา 90110", shippingInstruction: "ขนส่งเมืองทองเท่านั้น" },
  { id: "pongthep", name: "คุณพงษ์เทพ", group: "A", phone: "0979527973", address: "พื้นที่เช่าริมถนนหน้าโรงเรียนมหรรณพาราม แขวงฉิมพลี เขตตลิ่งชัน กรุงเทพฯ" },
  { id: "nongnuch", name: "นงนุช จันทร์แย้ม", group: "A", phone: "0822035782", address: "79/192 ม.11 มบ.เอ็มวินเลจ บางปะกง ฉะเชิงเทรา 24130", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "hiranya", name: "หิรัญญา ภักดีเมือง", group: "B", phone: "0833953863", address: "103 ม.2 ต.ปากหมาก อ.ไชยา จ.สุราษฎร์ธานี 84110", shippingInstruction: "ขนส่ง ส.สวัสดิ์ — วางสินค้าที่หน้าสหกรณ์ไชยา" },
  { id: "kwan", name: "ขวัญ", group: "B", phone: "0994309339", address: "83/3 ซอยงามวงศ์วาน 64 ถนนงามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900" },
  { id: "winai", name: "วินัย เกาะแก้ว", group: "B", phone: "0938684493", address: "6/4 หมู่ 12 ต.ทองเอน อ.อินทร์บุรี จ.สิงห์บุรี 16110", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "patcharee", name: "พัชรี แสงขันทอง", group: "B", phone: "0617537380", address: "374/1 ม.8 ต.เขาใหญ่ อ.ชะอำ จ.เพชรบุรี 76120", shippingInstruction: "ขนส่งอัศวินเท่านั้น" },
  { id: "bangsu", name: "คุณบังซู", group: "C", phone: "0948949704", address: "20/39 รัชดา 36 แขวงจันทรเกษม เขตจตุจักร กรุงเทพฯ 10900" },
];

export type ParsedItem = { product: ProductCode; name: string; kg: number; source: string };
export type ParseResult = {
  items: ParsedItem[];
  totalKg: number;
  deliveryDateISO: string | null;
  errors: string[];
  warnings: string[];
  needsReview: boolean;
};

function normalize(text: string) {
  return text
    .replace(/ก\s*\.\s*ก\s*\.?/g, "กก")
    .replace(/กิโลกรัม|กิโล|โล/g, "กก")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const THAI_MONTHS: Record<string, number> = {
  "ม.ค": 1, "มค": 1,
  "ก.พ": 2, "กพ": 2,
  "มี.ค": 3, "มีค": 3,
  "เม.ย": 4, "เมย": 4,
  "พ.ค": 5, "พค": 5,
  "มิ.ย": 6, "มิย": 6,
  "ก.ค": 7, "กค": 7,
  "ส.ค": 8, "สค": 8,
  "ก.ย": 9, "กย": 9,
  "ต.ค": 10, "ตค": 10,
  "พ.ย": 11, "พย": 11,
  "ธ.ค": 12, "ธค": 12,
};

function parseThaiDeliveryDate(text: string): string | null {
  const match = text.match(/(?:รอบ(?:จัด)?ส่ง|ส่ง(?:ของ)?(?:วันที่)?|รอบจัดส่ง)\s*(?:วันที่)?\s*(\d{1,2})\s*([ก-๙.]+)\s*\.?(\d{2,4})/i);
  if (!match) return null;
  const day = Number(match[1]);
  const monthKey = match[2].replace(/\./g, "");
  const monthEntry = Object.entries(THAI_MONTHS).find(([key]) => key.replace(/\./g, "") === monthKey);
  if (!monthEntry) return null;
  const month = monthEntry[1];
  let year = Number(match[3]);
  if (year < 100) year += 2500;
  if (year >= 2400) year -= 543;
  if (year < 2000 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseMarinatedOrder(raw: string, customer?: CustomerMaster): ParseResult {
  const text = normalize(raw);
  const items: ParsedItem[] = [];
  const errors: string[] = [];
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
        errors.push("พบรายการน่อง แต่ลูกค้ารายนี้ไม่ได้รับสิทธิ์สั่งน่อง");
        continue;
      }
      items.push({ product: entry.product, name: entry.name, kg, source: match[0] });
      usedRanges.push([start, end]);
    }
  }

  // สำหรับลูกค้าที่รู้ตัวตนแล้ว คำว่า “ไก่ 25” จากตัวอย่างจริงหมายถึงไก่ดั้งเดิม
  // แต่ถ้าไม่รู้ลูกค้า ห้ามเดาและส่งเข้าตรวจสอบ
  const bareChicken = [...text.matchAll(/(?:^|\s)ไก่\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:กก)?/gi)];
  for (const match of bareChicken) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (usedRanges.some(([s, e]) => start < e && end > s)) continue;
    const kg = Number(match[1]);
    if (!Number.isFinite(kg) || kg <= 0) continue;
    if (customer) {
      items.push({ product: "original", name: MARINATED_PRODUCTS.original.name, kg, source: match[0].trim() });
      usedRanges.push([start, end]);
    } else {
      errors.push("พบคำว่า ‘ไก่’ พร้อมจำนวน แต่ยังไม่ทราบลูกค้า จึงไม่ตีความอัตโนมัติ");
    }
  }

  const merged = new Map<ProductCode, ParsedItem>();
  for (const item of items) {
    const existing = merged.get(item.product);
    if (existing) existing.kg += item.kg;
    else merged.set(item.product, { ...item });
  }
  const finalItems = [...merged.values()];
  const totalKg = finalItems.reduce((sum, item) => sum + item.kg, 0);
  const deliveryDateISO = parseThaiDeliveryDate(text);

  if (!deliveryDateISO) {
    errors.push("ไม่พบวันที่จัดส่ง จึงยังบันทึกเป็น Draft Order ไม่ได้");
  }
  if (finalItems.length === 0) {
    errors.push("ไม่พบรายการสินค้าที่สามารถบันทึกเป็นออเดอร์ได้");
  }

  if (totalKg > 0 && totalKg < FREE_SHIPPING_MIN_KG && !customer?.ownDelivery) {
    warnings.push(`ยอดรวม ${totalKg} กก. ต่ำกว่าเกณฑ์ส่งฟรี ${FREE_SHIPPING_MIN_KG} กก.`);
  }
  const boxes = totalKg > 0 ? Math.ceil(totalKg / MAX_KG_PER_BOX) : 0;
  if (boxes > 1 && !customer?.ownDelivery) {
    warnings.push(`น้ำหนักรวมต้องจัดอย่างน้อย ${boxes} ลัง (ไม่เกิน ${MAX_KG_PER_BOX} กก./ลัง)`);
  }

  return {
    items: finalItems,
    totalKg,
    deliveryDateISO,
    errors,
    warnings,
    needsReview: errors.length > 0,
  };
}

export function priceOrder(result: ParseResult, customer: CustomerMaster) {
  const pricePerKg = GROUP_PRICE_PER_KG[customer.group];
  return { pricePerKg, total: result.totalKg * pricePerKg, warning: null as string | null };
}
