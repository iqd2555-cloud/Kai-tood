import { CUSTOMER_MASTER, parseMarinatedOrder } from "@/lib/marinated-order-parser";

type Expected = Record<string, number>;

type RegressionCase = {
  name: string;
  customerId: string;
  raw: string;
  expected: Expected;
  totalKg: number;
  deliveryDateISO?: string;
};

export const MARINATED_ORDER_REGRESSION_CASES: RegressionCase[] = [
  {
    name: "คุณแก๊ป 24 ก.ค. 69",
    customerId: "gap",
    raw: "เดิม 25\nพริก 20\nหนัง 10\nตับ 10\nรอบจัดส่ง 24 ก.ค.69",
    expected: { original: 25, spicy: 20, skin: 10, offal: 10 },
    totalKg: 65,
    deliveryDateISO: "2026-07-24",
  },
  {
    name: "คุณจินตณี 25 ก.ค. 69",
    customerId: "jintanee",
    raw: "ไก่ดั้งเดิม 25\nไก่พริก 15\nเครื่องใน 5\nรอบจัดส่งวันที่ 25 ก.ค. 69",
    expected: { original: 25, spicy: 15, offal: 5 },
    totalKg: 45,
    deliveryDateISO: "2026-07-25",
  },
  {
    name: "คุณพงษ์เทพ 1 ส.ค. 69",
    customerId: "pongthep",
    raw: "สั่งไก่หน่อย\nดั้งงเดิม 20 ก.ก\nทอดพริก 15 กก\nตับ 10 กก\nหนัง 5 กก\nรอบส่ง1 ส.ค.69",
    expected: { original: 20, spicy: 15, offal: 10, skin: 5 },
    totalKg: 50,
    deliveryDateISO: "2026-08-01",
  },
  {
    name: "นงนุช 13 ส.ค. 69",
    customerId: "nongnuch",
    raw: "สั่งออเดอร์ค่ะ\nไก่ดั้งเดิม 20\nไก่เผ็ด 10\nเครื่องใน 15\nรวม 45 กิโลกรัม\nรอบจัดส่ง 13 ส.ค.69",
    expected: { original: 20, spicy: 10, offal: 15 },
    totalKg: 45,
    deliveryDateISO: "2026-08-13",
  },
  {
    name: "หิรัญญา 8 ก.ค. 69",
    customerId: "hiranya",
    raw: "ดั้งเดิม 20\nเผ็ด 15\nตับ 10\nรอบส่ง 8ก.ค.69",
    expected: { original: 20, spicy: 15, offal: 10 },
    totalKg: 45,
    deliveryDateISO: "2026-07-08",
  },
  {
    name: "ขวัญ 10 ก.ค. 69",
    customerId: "kwan",
    raw: "รอบส่ง 10 ก.ค 69\nไก่ดั้งเดิม 45 กิโล",
    expected: { original: 45 },
    totalKg: 45,
    deliveryDateISO: "2026-07-10",
  },
  {
    name: "วินัย 16 ส.ค. 69",
    customerId: "winai",
    raw: "ดังเดิม 30\nเผ็ด 10\nหนัง 5\nรอบส่ง 16 ส.ค.69",
    expected: { original: 30, spicy: 10, skin: 5 },
    totalKg: 45,
    deliveryDateISO: "2026-08-16",
  },
  {
    name: "พัชรี 13 ส.ค. 69",
    customerId: "patcharee",
    raw: "ไก่ 25 ตับ 20\nรอบส่ง 13ส.ค.69",
    expected: { original: 25, offal: 20 },
    totalKg: 45,
    deliveryDateISO: "2026-08-13",
  },
  {
    name: "ขวัญ 2 ส.ค. 69",
    customerId: "kwan",
    raw: "ดั่งเดิม45โล\nรอบส่ง 2 ส.ค. 69",
    expected: { original: 45 },
    totalKg: 45,
    deliveryDateISO: "2026-08-02",
  },
  {
    name: "คุณบังซู 13 ส.ค. 69",
    customerId: "bangsu",
    raw: "พริก25\nดังเดิม10\nเครื่องใน10\nรอบจัดส่ง 13ส.ค.69",
    expected: { spicy: 25, original: 10, offal: 10 },
    totalKg: 45,
    deliveryDateISO: "2026-08-13",
  },
];

export function runMarinatedOrderRegression() {
  return MARINATED_ORDER_REGRESSION_CASES.map((test) => {
    const customer = CUSTOMER_MASTER.find((item) => item.id === test.customerId);
    if (!customer) return { name: test.name, passed: false, reason: "customer_not_found" };
    const parsed = parseMarinatedOrder(test.raw, customer);
    const actual = Object.fromEntries(parsed.items.map((item) => [item.product, item.kg]));
    const productKeys = new Set([...Object.keys(actual), ...Object.keys(test.expected)]);
    const itemsPassed = [...productKeys].every((key) => (actual[key] ?? 0) === (test.expected[key] ?? 0));
    const passed = itemsPassed && parsed.totalKg === test.totalKg && (!test.deliveryDateISO || parsed.deliveryDateISO === test.deliveryDateISO);
    return {
      name: test.name,
      passed,
      actual,
      expected: test.expected,
      totalKg: parsed.totalKg,
      expectedTotalKg: test.totalKg,
      deliveryDateISO: parsed.deliveryDateISO,
      expectedDeliveryDateISO: test.deliveryDateISO ?? null,
      warnings: parsed.warnings,
    };
  });
}
