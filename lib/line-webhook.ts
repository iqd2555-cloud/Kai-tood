import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient, getSupabaseAdminClientDiagnostics } from "./supabase-admin.ts";

type LineMessage = {
  id?: string;
  type?: string;
  text?: string;
};

type LineSource = {
  userId?: string;
};

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: LineMessage;
  source?: LineSource;
  timestamp?: number;
};

type LineWebhookPayload = {
  events?: LineEvent[];
};

type LineWebhookLogger = Pick<Console, "info" | "warn" | "error">;

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

type ProcessDeps = {
  supabase: SupabaseClient;
  channelAccessToken: string;
  fetchFn?: typeof fetch;
  logger?: LineWebhookLogger;
  supabaseDiagnostics?: { missing: string[]; invalid: string[] };
  analyzeReceipt?: typeof analyzeReceiptImage;
  analyzeTextExpense?: typeof analyzeCashFlowText;
  analyzeTextIncome?: typeof analyzeCashFlowIncomeText;
};

const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_CONTENT_API_BASE_URL = "https://api-data.line.me/v2/bot/message";
const BILL_IMAGE_BUCKET = "line-bill-receipts";
const RECEIPT_CONFIDENCE_THRESHOLD = 0.9;
const RECEIPT_PENDING_CONFIDENCE_THRESHOLD = 0.85;
const MAX_INCOMPLETE_RECEIPT_CONFIDENCE = RECEIPT_CONFIDENCE_THRESHOLD - 0.01;
const THAILAND_TIME_ZONE = "Asia/Bangkok";
const SPLIT_ORDER_PAIRING_WINDOW_MS = 30 * 60 * 1000;
const RECEIPT_CATEGORY_CODE_BY_LABEL: Record<string, string> = {
  "ค่าเช่าที่": "rent_payment",
  "อินเทอร์เน็ต": "internet_payment",
  "ไก่สด": "chicken_purchase",
  "ข้าวเหนียว": "ingredient_purchase",
  "เครื่องปรุง": "seasoning_cost",
  "ค่าแรง": "labor_cost",
  "น้ำแข็ง": "ice_cost",
  "ขนส่ง": "transport",
  "อื่นๆ": "misc_expense",
};
const INCOME_CATEGORY_CODE_BY_LABEL: Record<string, string> = {
  "ขายไก่หมัก": "marinated_chicken_sales",
  "ขายไก่สด": "fresh_chicken_sales",
  "ขายหนังสือ": "recipe_book_sales",
  "ขายคอร์ส": "course_sales",
  "ยอดขายหน้าร้าน": "sales_revenue",
  "ขายแฟรนไชส์": "franchise_income",
  "รับเงินอื่น ๆ": "other_income",
};
const INCOME_CATEGORY_LABEL_BY_CODE = Object.fromEntries(
  Object.entries(INCOME_CATEGORY_CODE_BY_LABEL).map(([label, code]) => [code, label]),
) as Record<string, string>;

const RECEIPT_CATEGORY_LABEL_BY_CODE: Record<string, string> = {
  rent_payment: "จ่ายค่าเช่าที่",
  internet_payment: "จ่ายค่าอินเทอร์เน็ต",
  chicken_purchase: "ซื้อไก่สด",
  ingredient_purchase: "ซื้อวัตถุดิบ/ข้าวเหนียว",
  seasoning_cost: "ค่าเครื่องปรุง",
  labor_cost: "ค่าแรง",
  ice_cost: "ค่าน้ำแข็ง",
  transport: "ค่าขนส่ง",
  misc_expense: "ค่าใช้จ่ายจิปาถะ",
};

type LockedRecipientExpenseRule = {
  names: string[];
  references: string[];
  category: keyof typeof RECEIPT_CATEGORY_LABEL_BY_CODE;
  description?: string;
};

const LOCKED_RECIPIENT_EXPENSE_RULES: LockedRecipientExpenseRule[] = [
  {
    names: ["ไพรม์สุข", "ไพรมสุข"],
    references: [],
    category: "seasoning_cost",
  },
  {
    names: ["IMBALANCE", "EMBALANCE"],
    references: [],
    category: "transport",
    description: "ค่าขนส่งหนังสือสูตร",
  },
  {
    names: ["เควีเอส เฟรชโปรดักส์", "KVS FRESH PRODUCTS"],
    references: [],
    category: "chicken_purchase",
    description: "ซื้อไก่สด",
  },
  {
    names: [
      "เทพธัญญะ",
      "เทพรัญญะ",
      "บริษัท เทพธัญญะ (นครสวรรค์) จำกัด",
      "บริษัท เทพรัญญะ (นครสวรรค์) จำกัด",
    ],
    references: [],
    category: "ingredient_purchase",
    description: "ค่าวัตถุดิบ",
  },
  {
    names: [
      "ธีรวุฒิ พันธุ์หงษ์",
      "ธีรวุฒิ พันธุ์หงส์",
      "ธีระวุฒิ พันธุ์หงษ์",
      "ธีระวุฒิ พันธุ์หงส์",
    ],
    references: [],
    category: "transport",
    description: "ค่าขนส่งไก่",
  },
  {
    names: [
      "สรวิศา เอี่ยมปฐม",
      "น.ส. สรวิศา เอี่ยมปฐม",
    ],
    references: [],
    category: "labor_cost",
    description: "ค่าแรง",
  },
];

const COMPANY_RECIPIENT_NAMES = [
  "เหนียวไก่เยอะโคตร อินสไปร์",
  "บจก. เหนียวไก่เยอะโคตร อินสไปร์",
  "บริษัท เหนียวไก่เยอะโคตร อินสไปร์ จำกัด",
];
const COMPANY_RECIPIENT_REFERENCES = ["6909", "9096"];
const FRESH_CHICKEN_INCOME_CUSTOMER_NAMES = ["ณัชชรีย์"];
const FRESH_CHICKEN_INCOME_CUSTOMER_REFERENCES = ["9901"];

function normalizedRecipientIdentity(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("th-TH");
}

function normalizedAccountReference(value: string) {
  return value.replace(/\D/gu, "");
}

function identityIncludes(value: string, candidates: string[]) {
  const normalizedValue = normalizedRecipientIdentity(value);
  return candidates.some((candidate) =>
    normalizedValue.includes(normalizedRecipientIdentity(candidate))
  );
}

function referenceIncludes(value: string, candidates: string[]) {
  const normalizedValue = normalizedAccountReference(value);
  return Boolean(normalizedValue) && candidates.some((candidate) =>
    normalizedValue.includes(normalizedAccountReference(candidate))
  );
}

function isCompanyCashFlowRecipient(recipientName: string, recipientReference: string) {
  return identityIncludes(recipientName, COMPANY_RECIPIENT_NAMES)
    || referenceIncludes(recipientReference, COMPANY_RECIPIENT_REFERENCES);
}

function companyIncomeCategory(senderName: string, senderReference: string) {
  const isFreshChickenCustomer = identityIncludes(senderName, FRESH_CHICKEN_INCOME_CUSTOMER_NAMES)
    || referenceIncludes(senderReference, FRESH_CHICKEN_INCOME_CUSTOMER_REFERENCES);
  return isFreshChickenCustomer ? "fresh_chicken_sales" : "marinated_chicken_sales";
}

function lockedRecipientRule(merchant: string, recipientReference: string) {
  const normalizedMerchant = normalizedRecipientIdentity(merchant);
  const normalizedReference = recipientReference.replace(/\D/gu, "");

  const nameRule = LOCKED_RECIPIENT_EXPENSE_RULES.find((rule) =>
    rule.names.some((name) => normalizedMerchant.includes(normalizedRecipientIdentity(name)))
  );
  if (nameRule) return nameRule;
  if (!normalizedReference) return null;

  return LOCKED_RECIPIENT_EXPENSE_RULES.find((rule) =>
    rule.references.some((reference) => normalizedReference.includes(reference.replace(/\D/gu, "")))
  ) ?? null;
}

function lockedRecipientCategory(merchant: string, recipientReference: string) {
  return lockedRecipientRule(merchant, recipientReference)?.category ?? null;
}

type ReceiptAnalysis = {
  merchant: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  category: string;
  confidence: number;
  documentType?: "bank_transfer_slip" | "invoice_receipt" | "other";
  memo?: string;
  recipientReference?: string;
  senderName?: string;
  recipientName?: string;
  senderReference?: string;
  transactionReference?: string;
};

function isCompanyIncomeReceipt(analysis: ReceiptAnalysis) {
  return analysis.documentType === "bank_transfer_slip"
    && analysis.amount > 0
    && analysis.confidence >= RECEIPT_CONFIDENCE_THRESHOLD
    && isActualISODate(analysis.transactionDate)
    && analysis.paymentMethod.includes("โอน")
    && isCompanyCashFlowRecipient(
      analysis.recipientName ?? "",
      analysis.recipientReference ?? "",
    )
    && Boolean((analysis.senderName ?? analysis.merchant).trim());
}

type TextExpenseAnalysis = {
  transactionDate: string;
  amount: number;
  description: string;
  paymentMethod: string;
  category: string;
};

type TextIncomeAnalysis = TextExpenseAnalysis & {
  customerName?: string;
  quantityKg?: number;
  unitPrice?: number;
};

export type LineWebhookResult = {
  ok: boolean;
  status: number;
  code: "ok" | "missing_config" | "invalid_signature" | "invalid_json" | "database_unavailable" | "processing_error";
};

type HandleDeps = {
  logger?: LineWebhookLogger;
  createSupabase?: typeof createSupabaseAdminClient;
  fetchFn?: typeof fetch;
  analyzeReceipt?: typeof analyzeReceiptImage;
  analyzeTextExpense?: typeof analyzeCashFlowText;
  analyzeTextIncome?: typeof analyzeCashFlowIncomeText;
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getLineWebhookConfig() {
  return {
    channelSecret: clean(process.env.LINE_CHANNEL_SECRET),
    channelAccessToken: clean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
  };
}

export function verifyLineSignature(rawBody: string, signature: string | null, channelSecret: string) {
  if (!signature || !channelSecret) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const actualBuffer = Buffer.from(signature, "base64");
  const expectedBuffer = Buffer.from(expected, "base64");

  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function eventDate(timestamp: number | undefined) {
  return new Date(typeof timestamp === "number" ? timestamp : Date.now()).toISOString();
}

function safeMessageId(event: LineEvent) {
  return event.message?.id?.trim() ?? "";
}

function dateOnlyInTimeZone(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function thailandDate(value: string | number | undefined) {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime())
    ? dateOnlyInTimeZone(new Date(), THAILAND_TIME_ZONE)
    : dateOnlyInTimeZone(date, THAILAND_TIME_ZONE);
}

function receiptCategoryFromMemo(memo: string) {
  const normalized = memo.replace(/\s+/gu, "").toLocaleLowerCase("th-TH");
  if (normalized.includes("ค่าแรง") || normalized.includes("ค่าจ้าง")) return "labor_cost";
  if (normalized.includes("ค่าน้ำแข็ง") || normalized.includes("น้ำแข็ง")) return "ice_cost";
  if (normalized.includes("ค่าขนส่ง") || normalized.includes("ค่าส่ง")) return "transport";
  if (normalized.includes("ค่าเช่า")) return "rent_payment";
  if (normalized.includes("อินเทอร์เน็ต")) return "internet_payment";
  if (normalized.includes("เครื่องปรุง")) return "seasoning_cost";
  if (normalized.includes("ข้าวเหนียว") || normalized.includes("วัตถุดิบ")) return "ingredient_purchase";
  if (
    normalized.includes("ไก่สด")
    || normalized.includes("หนังไก่")
    || normalized.includes("เครื่องในไก่")
  ) return "chicken_purchase";
  return null;
}

function receiptCategory(value: unknown, merchant: string, memo = "", recipientReference = "") {
  const text = String(value ?? "").trim();
  const recipientCategory = lockedRecipientCategory(merchant, recipientReference);
  const memoCategory = receiptCategoryFromMemo(memo);
  const normalizedMerchant = merchant.toLocaleLowerCase("th-TH");
  const isKvsChickenSupplier = normalizedMerchant.includes("เควีเอส เฟรชโปรดักส์")
    || normalizedMerchant.includes("kvs fresh products");

  // Owner-defined recipient rules are authoritative. Recipient names are checked
  // before Biller IDs/account references because payment processors can reuse a
  // single biller ID across different merchant display names.
  if (recipientCategory) return { code: recipientCategory, recognized: true };
  // A bank slip's memo describes the reason for payment and takes precedence over
  // company or account names when the recipient has no locked rule.
  if (memoCategory) return { code: memoCategory, recognized: true };
  // KVS invoices contain chicken, skin and offal. Keep this deterministic because
  // accounting categories must not depend solely on an OCR model's classification.
  if (isKvsChickenSupplier) return { code: "chicken_purchase", recognized: true };
  if (text in RECEIPT_CATEGORY_CODE_BY_LABEL) return { code: RECEIPT_CATEGORY_CODE_BY_LABEL[text], recognized: true };
  if (text in RECEIPT_CATEGORY_LABEL_BY_CODE) return { code: text, recognized: true };
  return { code: "misc_expense", recognized: false };
}

function deterministicTextExpenseCategory(messageText: string, analyzedCategory: unknown) {
  // The purpose stated in the original LINE message is more reliable than a
  // model-selected label. Check purpose-specific phrases first: for example,
  // "ค่าขนส่งไก่สด" is transport, while "จ่ายค่าไก่สด" is a chicken purchase.
  return receiptCategoryFromMemo(messageText)
    ?? receiptCategory(analyzedCategory, "").code;
}

function isActualISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function parsedCashFlowDate(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const [rawYear, month, day] = raw.split("-").map(Number);
  const year = rawYear >= 2400 && rawYear <= 2999 ? rawYear - 543 : rawYear;
  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return isActualISODate(normalized) ? normalized : null;
}

function normalizeCashFlowDate(value: unknown, eventAt: string) {
  return parsedCashFlowDate(value) ?? thailandDate(eventAt);
}

function isPaidPurchaseDocument(analysis: ReceiptAnalysis) {
  return analysis.documentType === "invoice_receipt";
}

function canAutoSaveReceipt(analysis: ReceiptAnalysis) {
  return analysis.amount > 0
    && analysis.confidence >= RECEIPT_CONFIDENCE_THRESHOLD
    && isActualISODate(analysis.transactionDate)
    && analysis.merchant !== "ไม่ทราบชื่อร้าน"
    && (analysis.paymentMethod !== "ไม่ระบุ" || isPaidPurchaseDocument(analysis))
    && analysis.category in RECEIPT_CATEGORY_LABEL_BY_CODE;
}

function canCreatePendingCashFlowReceipt(analysis: ReceiptAnalysis) {
  return analysis.amount > 0
    && analysis.confidence >= RECEIPT_PENDING_CONFIDENCE_THRESHOLD
    && isActualISODate(analysis.transactionDate)
    && analysis.merchant !== "ไม่ทราบชื่อร้าน"
    && analysis.paymentMethod === "ไม่ระบุ"
    && !isPaidPurchaseDocument(analysis)
    && analysis.category in RECEIPT_CATEGORY_LABEL_BY_CODE;
}

function cashFlowStatusForReceipt(analysis: ReceiptAnalysis) {
  if (canAutoSaveReceipt(analysis)) return "paid";
  if (canCreatePendingCashFlowReceipt(analysis)) return "pending_pay";
  return null;
}

function receiptCategoryLabel(code: string) {
  return RECEIPT_CATEGORY_LABEL_BY_CODE[code] ?? RECEIPT_CATEGORY_LABEL_BY_CODE.misc_expense;
}

function incomeCategory(value: unknown) {
  const text = String(value ?? "").trim();
  if (text in INCOME_CATEGORY_CODE_BY_LABEL) return INCOME_CATEGORY_CODE_BY_LABEL[text];
  if (text in INCOME_CATEGORY_LABEL_BY_CODE) return text;
  return "other_income";
}

function incomeCategoryLabel(code: string) {
  return INCOME_CATEGORY_LABEL_BY_CODE[code] ?? INCOME_CATEGORY_LABEL_BY_CODE.other_income;
}

function deterministicIncomeCategory(messageText: string, analyzedCategory: unknown) {
  const normalized = messageText.replace(/\s+/gu, "").toLocaleLowerCase("th-TH");

  // Owner-defined sales rules take precedence over the model. A long LINE message
  // may contain unrelated words, but these product phrases identify the actual sale.
  if (
    normalized.includes("ข้าวเหนียวไก่ทอด")
    || normalized.includes("ขายหน้าร้าน")
    || (normalized.includes("ไก่ทอด") && normalized.includes("ห่อ"))
  ) return "sales_revenue";
  if (normalized.includes("ไก่หมัก")) return "marinated_chicken_sales";
  if (normalized.includes("ไก่สด")) return "fresh_chicken_sales";
  if (normalized.includes("หนังสือ")) return "recipe_book_sales";
  if (normalized.includes("แฟรนไชส์")) return "franchise_income";
  if (normalized.includes("คอร์ส") || normalized.includes("อบรม")) return "course_sales";

  return incomeCategory(analyzedCategory);
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value.replace(/,/gu, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function thaiDeliveryDate(text: string, eventAt: string) {
  const compact = text.replace(/[\s.]+/gu, "");
  const match = compact.match(
    /รอบจัดส่ง(?:วันที่)?(\d{1,2})(มค|กพ|มีค|เมย|พค|มิย|กค|สค|กย|ตค|พย|ธค)(\d{2,4})/u,
  );
  if (!match) return thailandDate(eventAt);

  const monthByThaiAbbreviation: Record<string, number> = {
    มค: 1,
    กพ: 2,
    มีค: 3,
    เมย: 4,
    พค: 5,
    มิย: 6,
    กค: 7,
    สค: 8,
    กย: 9,
    ตค: 10,
    พย: 11,
    ธค: 12,
  };
  const day = Number(match[1]);
  const month = monthByThaiAbbreviation[match[2]];
  const rawYear = Number(match[3]);
  const expandedYear = rawYear < 100 ? 2500 + rawYear : rawYear;
  const year = expandedYear >= 2400 ? expandedYear - 543 : expandedYear;
  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return isActualISODate(normalized) ? normalized : thailandDate(eventAt);
}

function marinatedChickenItemWeights(text: string) {
  const itemPattern =
    /^(?:ไก่\s*)?(?:ดั้งเดิม|พริก)|^(?:ตับ|เครื่องใน|หนัง(?:ไก่)?|เอ็น(?:ไก่)?)/u;

  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .map((line) => {
      if (!itemPattern.test(line)) return null;
      const match = line.match(/([\d,.]+)\s*(?:กก\.?|กิโล(?:กรัม)?)?\s*$/u);
      return match ? parsePositiveNumber(match[1]) : null;
    })
    .filter((value): value is number => value !== null);
}

function marinatedChickenEquation(text: string) {
  const equation = text.match(
    /([\d,.]+)\s*[xX×*]\s*([\d,.]+)\s*=\s*([\d,.]+)\s*(?:บาท)?/u,
  );
  if (!equation) return null;

  const first = parsePositiveNumber(equation[1]);
  const second = parsePositiveNumber(equation[2]);
  const total = parsePositiveNumber(equation[3]);
  return first === null || second === null || total === null
    ? null
    : { first, second, total };
}

function marinatedChickenCustomerName(text: string) {
  const customerLine = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => /^คุณ\s*[^\d@]/u.test(line));
  const namedCustomer = customerLine
    ?.match(/^คุณ\s*(.+?)(?=\s+ร้าน|\s{2,}|$)/u)?.[1]
    ?.trim();
  if (namedCustomer) return `${/^คุณ\s/u.test(customerLine ?? "") ? "คุณ " : "คุณ"}${namedCustomer}`;

  const handle = text.match(/@\s*([^\s\d\n]+)/u)?.[1]?.trim();
  return handle ? `@${handle}` : "";
}

function looksLikeMarinatedChickenOrderDetails(value: string) {
  return marinatedChickenItemWeights(value).length > 0
    && Boolean(marinatedChickenCustomerName(value));
}

function looksLikeStandaloneMarinatedChickenEquation(value: string) {
  return /^\s*[\d,.]+\s*[xX×*]\s*[\d,.]+\s*=\s*[\d,.]+\s*(?:บาท)?\s*$/u.test(value);
}

function looksLikeMarinatedChickenDelivery(value: string) {
  return looksLikeMarinatedChickenOrderDetails(value)
    && Boolean(marinatedChickenEquation(value));
}

function structuredMarinatedChickenIncome(text: string, eventAt: string): TextIncomeAnalysis | null {
  if (!looksLikeMarinatedChickenDelivery(text)) return null;

  const equation = marinatedChickenEquation(text);
  if (!equation) return null;

  const { first, second, total } = equation;
  if (Math.abs(first * second - total) > 0.01) return null;

  const itemWeights = marinatedChickenItemWeights(text);
  const orderedQuantityKg = itemWeights.reduce((sum, value) => sum + value, 0);
  if (!(orderedQuantityKg > 0)) return null;

  let quantityKg: number;
  let unitPrice: number;
  if (Math.abs(second - orderedQuantityKg) <= 0.01) {
    quantityKg = second;
    unitPrice = first;
  } else if (Math.abs(first - orderedQuantityKg) <= 0.01) {
    quantityKg = first;
    unitPrice = second;
  } else {
    return null;
  }

  const customerName = marinatedChickenCustomerName(text);
  if (!customerName) return null;

  const quantityLabel = quantityKg.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const unitPriceLabel = unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 });

  return {
    transactionDate: thaiDeliveryDate(text, eventAt),
    amount: total,
    description: `ขายไก่หมักให้${customerName} ${quantityLabel} กก. × ${unitPriceLabel} บาท/กก.`,
    paymentMethod: "ไม่ระบุ",
    category: "marinated_chicken_sales",
    customerName,
    quantityKg,
    unitPrice,
  };
}

function receiptReviewReasons(analysis: ReceiptAnalysis) {
  const reasons: string[] = [];
  if (!(analysis.amount > 0)) reasons.push("ไม่พบยอดชำระ");
  if (!isActualISODate(analysis.transactionDate)) reasons.push("ไม่พบวันที่เอกสาร");
  if (analysis.merchant === "ไม่ทราบชื่อร้าน") reasons.push("ไม่พบชื่อร้าน");
  if (analysis.paymentMethod === "ไม่ระบุ" && !isPaidPurchaseDocument(analysis)) reasons.push("ไม่พบวิธีชำระเงิน");
  if (!(analysis.category in RECEIPT_CATEGORY_LABEL_BY_CODE)) reasons.push("ไม่สามารถระบุหมวดค่าใช้จ่าย");
  if (analysis.confidence < RECEIPT_CONFIDENCE_THRESHOLD) reasons.push("ความมั่นใจในการอ่านข้อมูลต่ำ");
  return reasons;
}

function receiptReviewMessage(analysis: ReceiptAnalysis) {
  const reasons = receiptReviewReasons(analysis);
  const amount = analysis.amount > 0
    ? `อ่านยอดได้ ${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท แต่`
    : "";
  const reasonText = reasons.length > 0 ? reasons.join(" และ") : "ข้อมูลยังไม่ครบถ้วน";

  return `${amount}${reasonText} จึงยังไม่บันทึกเป็นรายการจ่าย และเก็บไว้รอตรวจสอบ`;
}

export async function analyzeReceiptImage(
  image: { contentType: string; data: Buffer },
  eventAt: string,
  fetchFn: typeof fetch = fetch,
): Promise<ReceiptAnalysis> {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: clean(process.env.OPENAI_RECEIPT_MODEL) || "gpt-4.1-mini",
      temperature: 0,
      max_completion_tokens: 380,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              merchant: { type: "string", description: "สลิปโอนเงินให้ใช้ชื่อผู้รับเงิน (ไปยัง) ไม่ใช่ชื่อผู้โอน (จาก); ใบเสร็จให้ใช้ชื่อร้าน" },
              transactionDate: { type: "string", description: "วันที่บนบิลรูปแบบ YYYY-MM-DD" },
              amount: { type: "number", description: "ยอดชำระสุทธิ" },
              paymentMethod: { type: "string", description: "สลิปที่ระบุโอนเงินสำเร็จให้ใช้ โอนเงิน" },
              category: { type: "string", enum: Object.keys(RECEIPT_CATEGORY_CODE_BY_LABEL) },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              documentType: { type: "string", enum: ["bank_transfer_slip", "invoice_receipt", "other"] },
              memo: { type: "string", description: "ข้อความบันทึกช่วยจำ/หมายเหตุบนสลิป ถ้าไม่มีให้เป็นข้อความว่าง" },
              recipientReference: { type: "string", description: "Biller ID เลขบัญชีผู้รับ หรือรหัสร้านค้า ถ้าไม่มีให้เป็นข้อความว่าง" },
              senderName: { type: "string", description: "ชื่อผู้โอนใต้คำว่า จาก ถ้าไม่มีให้เป็นข้อความว่าง" },
              recipientName: { type: "string", description: "ชื่อผู้รับเงินใต้คำว่า ไปยัง ถ้าไม่มีให้เป็นข้อความว่าง" },
              senderReference: { type: "string", description: "เลขบัญชีผู้โอนที่สลิปแสดง รวมส่วนที่ปิดบัง ถ้าไม่มีให้เป็นข้อความว่าง" },
              transactionReference: { type: "string", description: "เลขที่รายการ รหัสอ้างอิง หรือเลขที่อ้างอิงของธุรกรรม ถ้าไม่มีให้เป็นข้อความว่าง" },
            },
            required: ["merchant", "transactionDate", "amount", "paymentMethod", "category", "confidence", "documentType", "memo", "recipientReference", "senderName", "recipientName", "senderReference", "transactionReference"],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `อ่านเอกสารทางการเงินภาษาไทย แยก merchant, transactionDate, amount, paymentMethod, category, confidence, documentType, memo, recipientReference, senderName, recipientName, senderReference และ transactionReference. สำหรับสลิปโอนเงิน/จ่ายบิล: merchant และ recipientName ต้องเป็นชื่อผู้รับใต้คำว่า "ไปยัง"; senderName ต้องเป็นชื่อผู้โอนใต้คำว่า "จาก"; คัดลอกเลขบัญชีผู้รับลง recipientReference เลขบัญชีผู้โอนลง senderReference และเลขที่รายการ/รหัสอ้างอิงลง transactionReference โดยเก็บส่วนที่อ่านได้แม้มี x หรือ * ปิดบัง. ถ้ามี "โอนเงินสำเร็จ" หรือ "จ่ายบิลสำเร็จ" ให้ paymentMethod เป็น "โอนเงิน". คัดลอก "บันทึกช่วยจำ" ลง memo และใช้ memo เป็นหลักในการเลือกหมวดค่าใช้จ่าย เช่น ค่าแรง/ค่าจ้างต้องเป็น "ค่าแรง". สำหรับใบเสร็จซื้อไก่ เนื้อไก่ หนังไก่ หรือเครื่องในไก่ให้ category เป็นไก่สด. สลิปโอนเงินสำเร็จที่ผู้รับคือ บจก. เหนียวไก่เยอะโคตร อินสไปร์ เป็นรายรับเสมอ; ผู้โอนชื่อ ณัชชรีย์ หรือบัญชีผู้โอนลงท้าย 990-1 ให้เป็นรายรับขายไก่สด ส่วนผู้โอนอื่นให้เป็นรายรับขายไก่หมัก และต้องอ่านชื่อผู้โอนให้ครบที่สุด. หากไม่เห็นวันที่ให้ใช้ ${thailandDate(eventAt)} และตั้ง confidence ต่ำกว่า ${RECEIPT_CONFIDENCE_THRESHOLD}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${image.contentType};base64,${image.data.toString("base64")}`, detail: "high" },
          },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`Receipt OCR failed with status ${response.status}`);
  const body = await response.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal) {
    throw new Error(`Receipt OCR returned an incomplete response: ${choice?.finish_reason ?? "missing"}`);
  }
  const parsed = JSON.parse(choice.message?.content ?? "{}") as Record<string, unknown>;
  const amount = Number(parsed.amount);
  const reportedConfidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const merchant = String(parsed.merchant ?? "").trim();
  const paymentMethod = String(parsed.paymentMethod ?? "").trim();
  const parsedTransactionDate = parsedCashFlowDate(parsed.transactionDate);
  const transactionDate = normalizeCashFlowDate(parsed.transactionDate, eventAt);
  const memo = String(parsed.memo ?? "").trim();
  const recipientReference = String(parsed.recipientReference ?? "").trim();
  const senderName = String(parsed.senderName ?? "").trim();
  const recipientName = String(parsed.recipientName ?? "").trim();
  const senderReference = String(parsed.senderReference ?? "").trim();
  const transactionReference = String(parsed.transactionReference ?? "").trim();
  const documentType = String(parsed.documentType ?? "").trim();
  const recipientRule = lockedRecipientRule(merchant, recipientReference);
  const recipientCategory = recipientRule?.category ?? null;
  const category = receiptCategory(parsed.category, merchant, memo, recipientReference);
  const description = recipientRule?.description
    ? `${recipientRule.description} - ${merchant}`
    : merchant;
  const hasCompleteFields = Boolean(
    merchant
    && paymentMethod
    && Number.isFinite(amount)
    && amount > 0
    && parsedTransactionDate
    && category.recognized,
  );
  const isCompleteBankTransferSlip = Boolean(
    hasCompleteFields
    && documentType === "bank_transfer_slip"
    && paymentMethod.includes("โอน")
    && (
      recipientCategory
      || (memo && receiptCategoryFromMemo(memo))
    ),
  );
  const isCompletePaidPurchaseDocument = Boolean(
    hasCompleteFields
    && documentType === "invoice_receipt",
  );
  const isCompleteCompanyIncome = Boolean(
    documentType === "bank_transfer_slip"
    && paymentMethod.includes("โอน")
    && senderName
    && Number.isFinite(amount)
    && amount > 0
    && parsedTransactionDate
    && isCompanyCashFlowRecipient(recipientName || merchant, recipientReference)
  );
  const confidence = isCompleteCompanyIncome
    ? Math.max(reportedConfidence, 0.95)
    : hasCompleteFields
      ? isCompleteBankTransferSlip || isCompletePaidPurchaseDocument
        ? Math.max(reportedConfidence, 0.95)
        : reportedConfidence
      : Math.min(reportedConfidence, MAX_INCOMPLETE_RECEIPT_CONFIDENCE);

  return {
    merchant: isCompleteCompanyIncome ? senderName : description || "ไม่ทราบชื่อร้าน",
    transactionDate,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: isCompleteCompanyIncome
      ? companyIncomeCategory(senderName, senderReference)
      : category.code,
    confidence,
    documentType: documentType === "bank_transfer_slip" || documentType === "invoice_receipt"
      ? documentType
      : "other",
    memo,
    recipientReference,
    senderName,
    recipientName: recipientName || (documentType === "bank_transfer_slip" ? merchant : ""),
    senderReference,
    transactionReference,
  };
}

function looksLikeExpenseCommand(value: string) {
  return /^\s*(จ่าย|ชำระ|โอนจ่าย)/u.test(value) && /\d/.test(value);
}

export async function analyzeCashFlowText(
  text: string,
  eventAt: string,
  fetchFn: typeof fetch = fetch,
): Promise<TextExpenseAnalysis> {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: clean(process.env.OPENAI_RECEIPT_MODEL) || "gpt-4.1-mini",
      temperature: 0,
      max_completion_tokens: 200,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cash_flow_text_expense",
          strict: true,
          schema: {
            type: "object",
            properties: {
              transactionDate: { type: "string", description: "วันที่รูปแบบ YYYY-MM-DD" },
              amount: { type: "number" },
              description: { type: "string" },
              paymentMethod: { type: "string" },
              category: { type: "string", enum: Object.keys(RECEIPT_CATEGORY_CODE_BY_LABEL) },
            },
            required: ["transactionDate", "amount", "description", "paymentMethod", "category"],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: `แยกข้อความค่าใช้จ่ายสำหรับ Cash Flow: "${text}". คำว่า "จ่าย" หมายถึงจ่ายเงินจริงแล้ว หากไม่ระบุช่องทางให้ใช้ "ไม่ระบุ" หากไม่ระบุวันที่ให้ใช้ ${thailandDate(eventAt)} เลือกหมวดตามวัตถุประสงค์ที่จ่ายจริง: ค่าเช่าที่=ค่าเช่าร้านหรือพื้นที่, อินเทอร์เน็ต=ค่าบริการอินเทอร์เน็ต, ไก่สด=ซื้อไก่สด/หนังไก่/เครื่องในไก่, ข้าวเหนียว=ซื้อข้าวเหนียวหรือวัตถุดิบ, เครื่องปรุง=ซื้อเครื่องปรุง, ค่าแรง=ค่าแรงหรือค่าจ้าง, น้ำแข็ง=ซื้อน้ำแข็ง, ขนส่ง=ค่าขนส่งหรือค่าส่ง, อื่นๆ=ไม่เข้าเกณฑ์ข้างต้น ห้ามเลือกจากคำว่า "จ่ายค่า" แบบแยกคำ ตัวอย่าง "จ่ายค่าไก่สด 4,020 บาท" ต้องเป็นหมวด "ไก่สด"`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`Cash Flow text analysis failed with status ${response.status}`);
  const body = await response.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal) {
    throw new Error(`Cash Flow text analysis returned an incomplete response: ${choice?.finish_reason ?? "missing"}`);
  }

  const parsed = JSON.parse(choice.message?.content ?? "{}") as Record<string, unknown>;
  const amount = Number(parsed.amount);
  const description = String(parsed.description ?? "").trim();
  const paymentMethod = String(parsed.paymentMethod ?? "").trim();
  const transactionDate = normalizeCashFlowDate(parsed.transactionDate, eventAt);
  const category = receiptCategory(
    deterministicTextExpenseCategory(text, parsed.category),
    "",
  );

  if (!(Number.isFinite(amount) && amount > 0 && description && category.recognized)) {
    throw new Error("Cash Flow text does not contain a valid expense");
  }

  return {
    transactionDate,
    amount,
    description,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: category.code,
  };
}

function looksLikeIncomeCommand(value: string) {
  return (/^\s*ขาย/u.test(value) && /\d/.test(value))
    || looksLikeMarinatedChickenDelivery(value);
}

export async function analyzeCashFlowIncomeText(
  text: string,
  eventAt: string,
  fetchFn: typeof fetch = fetch,
): Promise<TextIncomeAnalysis> {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: clean(process.env.OPENAI_RECEIPT_MODEL) || "gpt-4.1-mini",
      temperature: 0,
      max_completion_tokens: 220,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "cash_flow_text_income",
          strict: true,
          schema: {
            type: "object",
            properties: {
              transactionDate: { type: "string", description: "วันที่รูปแบบ YYYY-MM-DD" },
              amount: { type: "number", description: "ยอดรับเงินจริง ผลลัพธ์สุดท้ายของสมการถ้ามี" },
              description: { type: "string", description: "สินค้าและชื่อลูกค้าแบบกระชับ" },
              paymentMethod: { type: "string" },
              category: { type: "string", enum: Object.keys(INCOME_CATEGORY_CODE_BY_LABEL) },
            },
            required: ["transactionDate", "amount", "description", "paymentMethod", "category"],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: `แยกข้อความขายสดที่รับเงินแล้วสำหรับ Cash Flow: "${text}". คำนวณสมการจำนวนคูณราคา เช่น 68*50=3400 และใช้ยอดหลังเครื่องหมายเท่ากับ หากไม่ระบุช่องทางให้ใช้ "ไม่ระบุ" หากไม่ระบุวันที่ให้ใช้ ${thailandDate(eventAt)} ข้าวเหนียวไก่ทอด การขายเป็นห่อ และคำว่าหน้าร้านต้องเป็นหมวด "ยอดขายหน้าร้าน" ไม่ใช่ "ขายคอร์ส" สินค้าที่ไม่ตรงหมวดเฉพาะให้ใช้รายรับอื่น`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`Cash Flow income text analysis failed with status ${response.status}`);
  const body = await response.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal) {
    throw new Error(`Cash Flow income text analysis returned an incomplete response: ${choice?.finish_reason ?? "missing"}`);
  }

  const parsed = JSON.parse(choice.message?.content ?? "{}") as Record<string, unknown>;
  const amount = Number(parsed.amount);
  const description = String(parsed.description ?? "").trim();
  const paymentMethod = String(parsed.paymentMethod ?? "").trim();
  const transactionDate = normalizeCashFlowDate(parsed.transactionDate, eventAt);

  if (!(Number.isFinite(amount) && amount > 0 && description)) {
    throw new Error("Cash Flow sales text does not contain a valid received amount");
  }

  return {
    transactionDate,
    amount,
    description,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: deterministicIncomeCategory(text, parsed.category),
  };
}

async function replyToLine(replyToken: string | undefined, text: string, channelAccessToken: string, fetchFn: typeof fetch) {
  if (!replyToken) return;

  const response = await fetchFn(LINE_REPLY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    throw new Error(`LINE reply API failed with status ${response.status}`);
  }
}

async function downloadLineImage(messageId: string, channelAccessToken: string, fetchFn: typeof fetch) {
  const response = await fetchFn(`${LINE_CONTENT_API_BASE_URL}/${encodeURIComponent(messageId)}/content`, {
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  });

  if (!response.ok) {
    throw new Error(`LINE content API failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();

  return { contentType, data: Buffer.from(arrayBuffer) };
}

async function insertBillReceiptEvent(
  supabase: NonNullable<SupabaseClient>,
  event: LineEvent,
  imageStoragePath: string | null,
  analysis?: ReceiptAnalysis,
  cashFlowEntryId?: string | null,
  textData?: Record<string, unknown>,
) {
  const processed = Boolean(
    analysis
    && (canAutoSaveReceipt(analysis) || isCompanyIncomeReceipt(analysis))
  );
  const receiptPayload = {
    message_id: safeMessageId(event),
    line_user_id: event.source?.userId ?? null,
    message_type: event.message?.type ?? "unknown",
    event_at: eventDate(event.timestamp),
    processing_status: processed || cashFlowEntryId ? "processed" : imageStoragePath ? "pending_review" : "message_received",
    image_storage_path: imageStoragePath,
    extracted_data: textData ?? analysis ?? null,
    confidence: analysis?.confidence ?? null,
    cash_flow_entry_id: cashFlowEntryId ?? null,
    processing_error: analysis && !processed ? receiptReviewReasons(analysis).join("; ") || "ข้อมูลยังไม่ครบถ้วน" : null,
  };
  const { error } = await supabase.from("line_bill_receipts").insert(receiptPayload);

  if (error) {
    if (error.code === "23505") {
      if (analysis || textData) {
        const { error: updateError } = await supabase
          .from("line_bill_receipts")
          .update(receiptPayload)
          .eq("message_id", safeMessageId(event));
        if (updateError) throw new Error(`Failed to update existing LINE bill receipt event: ${updateError.code ?? "unknown"}`);
      }
      return { inserted: false };
    }
    throw new Error(`Failed to insert LINE bill receipt event: ${error.code ?? "unknown"}`);
  }

  return { inserted: true };
}

type PendingMarinatedChickenOrder = {
  messageId: string;
  eventAt: string;
  text: string;
  extractedData: Record<string, unknown>;
};

async function findPendingMarinatedChickenOrder(
  supabase: NonNullable<SupabaseClient>,
  lineUserId: string | undefined,
  eventAt: string,
): Promise<PendingMarinatedChickenOrder | null> {
  if (!lineUserId) return null;

  const eventTime = new Date(eventAt);
  if (Number.isNaN(eventTime.getTime())) return null;
  const cutoff = new Date(eventTime.getTime() - SPLIT_ORDER_PAIRING_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("line_bill_receipts")
    .select("message_id,event_at,extracted_data")
    .eq("line_user_id", lineUserId)
    .eq("message_type", "text")
    .eq("processing_status", "message_received")
    .gte("event_at", cutoff)
    .lte("event_at", eventAt)
    .order("event_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`Failed to find pending LINE chicken order: ${error.code ?? "unknown"}`);
  }

  for (const row of (data ?? []) as Array<{
    message_id?: unknown;
    event_at?: unknown;
    extracted_data?: unknown;
  }>) {
    const extractedData = row.extracted_data;
    if (!extractedData || typeof extractedData !== "object" || Array.isArray(extractedData)) continue;
    const payload = extractedData as Record<string, unknown>;
    if (payload.kind !== "marinated_chicken_order" || typeof payload.text !== "string") continue;
    if (typeof row.message_id !== "string" || typeof row.event_at !== "string") continue;

    return {
      messageId: row.message_id,
      eventAt: row.event_at,
      text: payload.text,
      extractedData: payload,
    };
  }

  return null;
}

async function markPendingMarinatedChickenOrderProcessed(
  supabase: NonNullable<SupabaseClient>,
  pendingOrder: PendingMarinatedChickenOrder,
  equationMessageId: string,
  cashFlowEntryId: string | null,
) {
  const { error } = await supabase
    .from("line_bill_receipts")
    .update({
      processing_status: "processed",
      cash_flow_entry_id: cashFlowEntryId,
      extracted_data: {
        ...pendingOrder.extractedData,
        paired_equation_message_id: equationMessageId,
      },
      processing_error: null,
    })
    .eq("message_id", pendingOrder.messageId);

  if (error) {
    throw new Error(`Failed to complete pending LINE chicken order: ${error.code ?? "unknown"}`);
  }
}

async function insertCashFlowExpense(
  supabase: NonNullable<SupabaseClient>,
  event: LineEvent,
  imageStoragePath: string,
  analysis: ReceiptAnalysis,
) {
  const status = cashFlowStatusForReceipt(analysis);
  if (!status) return null;

  const { data, error } = await supabase.from("cash_flow_entries").insert({
    transaction_date: analysis.transactionDate,
    type: "expense",
    status,
    category: analysis.category,
    description: analysis.merchant,
    amount: analysis.amount,
    payment_method: analysis.paymentMethod,
    source: "other",
    source_ref_id: `line:${safeMessageId(event)}`,
    attachment_url: imageStoragePath,
    document_type: "receipt",
    has_attachment: true,
    note: status === "paid"
      ? `บันทึกอัตโนมัติจาก LINE OA (ความมั่นใจ ${Math.round(analysis.confidence * 100)}%)`
      : `บันทึกอัตโนมัติจาก LINE OA เป็นรายการรอจ่าย เนื่องจากไม่พบวิธีชำระเงิน (ความมั่นใจ ${Math.round(analysis.confidence * 100)}%)`,
  }).select("id").maybeSingle();

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("cash_flow_entries")
      .select("id")
      .eq("source_ref_id", `line:${safeMessageId(event)}`)
      .maybeSingle();

    if (lookupError) throw new Error(`Failed to find existing cash flow entry: ${lookupError.code ?? "unknown"}`);
    return (existing as { id?: string } | null)?.id ?? null;
  }

  if (error) throw new Error(`Failed to create cash flow entry: ${error.code ?? "unknown"}`);
  return (data as { id?: string } | null)?.id ?? null;
}

function imageIncomeSourceRefId(event: LineEvent, analysis: ReceiptAnalysis) {
  const transactionReference = normalizedRecipientIdentity(analysis.transactionReference ?? "");
  return transactionReference
    ? `bank-slip:${transactionReference}`
    : `line:${safeMessageId(event)}`;
}

async function insertImageCashFlowIncome(
  supabase: NonNullable<SupabaseClient>,
  event: LineEvent,
  imageStoragePath: string,
  analysis: ReceiptAnalysis,
) {
  if (!isCompanyIncomeReceipt(analysis)) return null;

  const senderName = analysis.senderName?.trim() || analysis.merchant;
  const category = companyIncomeCategory(senderName, analysis.senderReference ?? "");
  const productName = category === "fresh_chicken_sales" ? "ไก่สด" : "ไก่หมัก";
  const sourceRefId = imageIncomeSourceRefId(event, analysis);
  const { data, error } = await supabase.from("cash_flow_entries").insert({
    transaction_date: analysis.transactionDate,
    type: "income",
    status: "received",
    category,
    description: `ขาย${productName} - ผู้โอน ${senderName}`,
    amount: analysis.amount,
    payment_method: "โอนเงิน",
    source: "other",
    source_ref_id: sourceRefId,
    attachment_url: imageStoragePath,
    document_type: "receipt",
    has_attachment: true,
    note: `บันทึกรายรับอัตโนมัติจากสลิป LINE OA (ความมั่นใจ ${Math.round(analysis.confidence * 100)}%)`,
  }).select("id").maybeSingle();

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("cash_flow_entries")
      .select("id")
      .eq("source_ref_id", sourceRefId)
      .maybeSingle();
    if (lookupError) throw new Error(`Failed to find existing image income entry: ${lookupError.code ?? "unknown"}`);
    return (existing as { id?: string } | null)?.id ?? null;
  }

  if (error) throw new Error(`Failed to create image income entry: ${error.code ?? "unknown"}`);
  return (data as { id?: string } | null)?.id ?? null;
}

async function insertTextCashFlowExpense(
  supabase: NonNullable<SupabaseClient>,
  event: LineEvent,
  analysis: TextExpenseAnalysis,
) {
  const sourceRefId = `line:${safeMessageId(event)}`;
  const { data, error } = await supabase.from("cash_flow_entries").insert({
    transaction_date: analysis.transactionDate,
    type: "expense",
    status: "paid",
    category: analysis.category,
    description: analysis.description,
    amount: analysis.amount,
    payment_method: analysis.paymentMethod,
    source: "other",
    source_ref_id: sourceRefId,
    attachment_url: null,
    document_type: "no_document",
    has_attachment: false,
    note: "บันทึกอัตโนมัติจากข้อความ LINE OA โดยไม่มีเอกสารแนบ",
  }).select("id").maybeSingle();

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("cash_flow_entries")
      .select("id")
      .eq("source_ref_id", sourceRefId)
      .maybeSingle();
    if (lookupError) throw new Error(`Failed to find existing text cash flow entry: ${lookupError.code ?? "unknown"}`);
    return (existing as { id?: string } | null)?.id ?? null;
  }

  if (error) throw new Error(`Failed to create text cash flow entry: ${error.code ?? "unknown"}`);
  return (data as { id?: string } | null)?.id ?? null;
}

async function insertTextCashFlowIncome(
  supabase: NonNullable<SupabaseClient>,
  event: LineEvent,
  analysis: TextIncomeAnalysis,
  sourceMessageId = safeMessageId(event),
) {
  const sourceRefId = `line:${sourceMessageId}`;
  const { data, error } = await supabase.from("cash_flow_entries").insert({
    transaction_date: analysis.transactionDate,
    type: "income",
    status: "received",
    category: analysis.category,
    description: analysis.description,
    amount: analysis.amount,
    payment_method: analysis.paymentMethod,
    source: "other",
    source_ref_id: sourceRefId,
    attachment_url: null,
    document_type: "no_document",
    has_attachment: false,
    note: "บันทึกรายรับจากข้อความขายสดใน LINE OA โดยไม่มีเอกสารแนบ",
  }).select("id").maybeSingle();

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await supabase
      .from("cash_flow_entries")
      .select("id")
      .eq("source_ref_id", sourceRefId)
      .maybeSingle();
    if (lookupError) throw new Error(`Failed to find existing text income entry: ${lookupError.code ?? "unknown"}`);
    return (existing as { id?: string } | null)?.id ?? null;
  }

  if (error) throw new Error(`Failed to create text income entry: ${error.code ?? "unknown"}`);
  return (data as { id?: string } | null)?.id ?? null;
}

async function uploadBillImage(
  supabase: NonNullable<SupabaseClient>,
  messageId: string,
  image: { contentType: string; data: Buffer },
  eventAt: string,
) {
  const extension = image.contentType.includes("png") ? "png" : image.contentType.includes("webp") ? "webp" : "jpg";
  const path = `line/${thailandDate(eventAt)}/${messageId}.${extension}`;
  const { error } = await supabase.storage.from(BILL_IMAGE_BUCKET).upload(path, image.data, {
    contentType: image.contentType,
    // LINE may retry the same webhook after a partial failure. Reusing the deterministic path is safe.
    upsert: true,
  });

  if (error) throw new Error("Failed to upload LINE bill receipt image");

  return path;
}

export async function processLineWebhookPayload(payload: LineWebhookPayload, deps: ProcessDeps) {
  const fetchFn = deps.fetchFn ?? fetch;
  const logger = deps.logger ?? console;

  if (!deps.supabase) {
    const diagnostics = deps.supabaseDiagnostics ?? getSupabaseAdminClientDiagnostics();
    logger.error("LINE webhook cannot process events because Supabase admin client is unavailable", {
      stage: "supabase_client",
      missing: diagnostics.missing,
      invalid: diagnostics.invalid,
    });
    return { ok: false, status: 500, code: "database_unavailable" as const };
  }

  for (const event of payload.events ?? []) {
    if (event.type !== "message" || !safeMessageId(event)) continue;

    try {
      if (event.message?.type === "image") {
        const image = await downloadLineImage(safeMessageId(event), deps.channelAccessToken, fetchFn);
        const eventAt = eventDate(event.timestamp);
        const imageStoragePath = await uploadBillImage(deps.supabase, safeMessageId(event), image, eventAt);
        const analysis = await (deps.analyzeReceipt ?? analyzeReceiptImage)(image, eventAt, fetchFn);
        const incomeReceipt = isCompanyIncomeReceipt(analysis);
        const cashFlowEntryId = incomeReceipt
          ? await insertImageCashFlowIncome(deps.supabase, event, imageStoragePath, analysis)
          : await insertCashFlowExpense(deps.supabase, event, imageStoragePath, analysis);
        const { inserted } = await insertBillReceiptEvent(deps.supabase, event, imageStoragePath, analysis, cashFlowEntryId);

        if (inserted) {
          const saved = canAutoSaveReceipt(analysis);
          const savedPending = canCreatePendingCashFlowReceipt(analysis) && Boolean(cashFlowEntryId);
          await replyToLine(
            event.replyToken,
            incomeReceipt
              ? `บันทึกรายรับเข้า Cash Flow แล้ว\nผู้โอน ${analysis.senderName || analysis.merchant}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ รับแล้ว\nหมวด ${incomeCategoryLabel(companyIncomeCategory(analysis.senderName || analysis.merchant, analysis.senderReference ?? ""))}`
              : saved
              ? `บันทึกเข้า Cash Flow แล้ว\n${analysis.merchant}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ จ่ายแล้ว\nหมวด ${receiptCategoryLabel(analysis.category)}`
              : savedPending
                ? `บันทึกเข้า Cash Flow แล้ว\n${analysis.merchant}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ รอจ่าย\nกรุณาตรวจสอบและระบุวิธีชำระเงิน`
                : receiptReviewMessage(analysis),
            deps.channelAccessToken,
            fetchFn,
          );
        }
      } else if (event.message?.type === "text") {
        const messageText = event.message.text?.trim() ?? "";
        if (looksLikeExpenseCommand(messageText)) {
          const eventAt = eventDate(event.timestamp);
          const analyzedExpense = await (deps.analyzeTextExpense ?? analyzeCashFlowText)(messageText, eventAt, fetchFn);
          const analysis = {
            ...analyzedExpense,
            category: deterministicTextExpenseCategory(messageText, analyzedExpense.category),
          };
          const cashFlowEntryId = await insertTextCashFlowExpense(deps.supabase, event, analysis);
          const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null, undefined, cashFlowEntryId);

          if (inserted) {
            await replyToLine(
              event.replyToken,
              `บันทึกเข้า Cash Flow แล้ว\n${analysis.description}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ จ่ายแล้ว\nหมวด ${receiptCategoryLabel(analysis.category)}\nเอกสาร ไม่มีเอกสาร`,
              deps.channelAccessToken,
              fetchFn,
            );
          }
        } else if (
          looksLikeMarinatedChickenOrderDetails(messageText)
          || looksLikeStandaloneMarinatedChickenEquation(messageText)
        ) {
          const eventAt = eventDate(event.timestamp);
          const standaloneEquation = looksLikeStandaloneMarinatedChickenEquation(messageText);
          const pendingOrder = standaloneEquation
            ? await findPendingMarinatedChickenOrder(deps.supabase, event.source?.userId, eventAt)
            : null;

          if (standaloneEquation && !pendingOrder) {
            const { inserted } = await insertBillReceiptEvent(
              deps.supabase,
              event,
              null,
              undefined,
              null,
              { kind: "marinated_chicken_equation", text: messageText },
            );
            if (inserted) {
              await replyToLine(
                event.replyToken,
                "ยังไม่บันทึกรายรับ เพราะไม่พบรายละเอียดออเดอร์ก่อนหน้าจากผู้ส่งคนนี้ภายใน 30 นาที กรุณาส่งรายละเอียดออเดอร์ แล้วตามด้วยสมการยอดเงินอีกครั้ง",
                deps.channelAccessToken,
                fetchFn,
              );
            }
            continue;
          }

          const combinedText = pendingOrder
            ? `${pendingOrder.text}\n${messageText}`
            : messageText;
          const structuredIncome = structuredMarinatedChickenIncome(
            combinedText,
            pendingOrder?.eventAt ?? eventAt,
          );

          if (!marinatedChickenEquation(combinedText)) {
            const { inserted } = await insertBillReceiptEvent(
              deps.supabase,
              event,
              null,
              undefined,
              null,
              { kind: "marinated_chicken_order", text: messageText },
            );
            if (inserted) {
              const orderedQuantityKg = marinatedChickenItemWeights(messageText)
                .reduce((sum, value) => sum + value, 0);
              await replyToLine(
                event.replyToken,
                `รับรายละเอียดออเดอร์ไก่หมักแล้ว\nน้ำหนักรวม ${orderedQuantityKg.toLocaleString("en-US", { maximumFractionDigits: 2 })} กก.\nกรุณาส่งสมการยอดเงินต่อ เช่น ${orderedQuantityKg}*65=${(orderedQuantityKg * 65).toLocaleString("en-US")}บาท`,
                deps.channelAccessToken,
                fetchFn,
              );
            }
            continue;
          }

          if (!structuredIncome) {
            const { inserted } = await insertBillReceiptEvent(
              deps.supabase,
              event,
              null,
              undefined,
              null,
              {
                kind: standaloneEquation ? "marinated_chicken_equation" : "marinated_chicken_order",
                text: messageText,
              },
            );
            if (inserted) {
              await replyToLine(
                event.replyToken,
                "ยังไม่บันทึกรายรับ เพราะยอดกิโลกรัมรายการย่อยไม่ตรงกับสมการ หรือยอดคูณและยอดรวมไม่ตรงกัน กรุณาตรวจสอบแล้วส่งสมการใหม่",
                deps.channelAccessToken,
                fetchFn,
              );
            }
            continue;
          }

          const analysis = {
            ...structuredIncome,
            // Structured delivery lines describe the franchise customer's shop and
            // can contain "ข้าวเหนียวไก่ทอด"; the sold product is still marinated chicken.
            category: "marinated_chicken_sales",
          };
          const sourceMessageId = pendingOrder?.messageId ?? safeMessageId(event);
          const cashFlowEntryId = await insertTextCashFlowIncome(
            deps.supabase,
            event,
            analysis,
            sourceMessageId,
          );
          const { inserted } = await insertBillReceiptEvent(
            deps.supabase,
            event,
            null,
            undefined,
            cashFlowEntryId,
            {
              kind: standaloneEquation ? "marinated_chicken_equation" : "marinated_chicken_order",
              text: messageText,
              paired_order_message_id: pendingOrder?.messageId ?? null,
            },
          );
          if (pendingOrder) {
            await markPendingMarinatedChickenOrderProcessed(
              deps.supabase,
              pendingOrder,
              safeMessageId(event),
              cashFlowEntryId,
            );
          }

          if (inserted) {
            await replyToLine(
              event.replyToken,
              `บันทึกรายรับเข้า Cash Flow แล้ว\nลูกค้า ${analysis.customerName}\nปริมาณ ${analysis.quantityKg?.toLocaleString("en-US", { maximumFractionDigits: 2 })} กก.\nราคา ${analysis.unitPrice?.toLocaleString("en-US", { maximumFractionDigits: 2 })} บาท/กก.\nยอดรวม ${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ รับแล้ว\nหมวด ${incomeCategoryLabel(analysis.category)}\nเอกสาร ไม่มีเอกสาร`,
              deps.channelAccessToken,
              fetchFn,
            );
          }
        } else if (looksLikeIncomeCommand(messageText)) {
          const eventAt = eventDate(event.timestamp);
          const isStructuredDelivery = looksLikeMarinatedChickenDelivery(messageText);
          const structuredIncome = structuredMarinatedChickenIncome(messageText, eventAt);
          if (isStructuredDelivery && !structuredIncome) {
            const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null);
            if (inserted) {
              await replyToLine(
                event.replyToken,
                "ยังไม่บันทึกรายรับ เพราะยอดกิโลกรัมรายการย่อยไม่ตรงกับสมการท้ายข้อความ กรุณาตรวจสอบแล้วส่งใหม่",
                deps.channelAccessToken,
                fetchFn,
              );
            }
            continue;
          }

          const analyzedIncome = structuredIncome
            ?? await (deps.analyzeTextIncome ?? analyzeCashFlowIncomeText)(messageText, eventAt, fetchFn);
          const analysis = {
            ...analyzedIncome,
            category: deterministicIncomeCategory(messageText, analyzedIncome.category),
          };
          const cashFlowEntryId = await insertTextCashFlowIncome(deps.supabase, event, analysis);
          const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null, undefined, cashFlowEntryId);

          if (inserted) {
            const structuredSummary = analysis.customerName && analysis.quantityKg && analysis.unitPrice
              ? `ลูกค้า ${analysis.customerName}\nปริมาณ ${analysis.quantityKg.toLocaleString("en-US", { maximumFractionDigits: 2 })} กก.\nราคา ${analysis.unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} บาท/กก.`
              : analysis.description;
            await replyToLine(
              event.replyToken,
              `บันทึกรายรับเข้า Cash Flow แล้ว\n${structuredSummary}\nยอดรวม ${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ รับแล้ว\nหมวด ${incomeCategoryLabel(analysis.category)}\nเอกสาร ไม่มีเอกสาร`,
              deps.channelAccessToken,
              fetchFn,
            );
          }
        } else {
          const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null);
          if (inserted) {
            await replyToLine(
              event.replyToken,
              "พิมพ์รายการ เช่น จ่ายค่าน้ำแข็ง 350 บาท หรือ ขายไก่หมัก 68*50=3,400 บาท หรือส่งรูปบิล",
              deps.channelAccessToken,
              fetchFn,
            );
          }
        }
      }
    } catch (error) {
      logger.error("LINE webhook event processing failed", {
        messageId: safeMessageId(event),
        messageType: event.message?.type,
        error: error instanceof Error ? error.message : "unknown",
      });
      return { ok: false, status: 500, code: "processing_error" as const };
    }
  }

  logger.info("LINE webhook processed", { stage: "complete", eventCount: payload.events?.length ?? 0 });
  return { ok: true, status: 200, code: "ok" as const };
}

export async function handleLineWebhookRequest(request: Request, deps: HandleDeps = {}): Promise<LineWebhookResult> {
  const logger = deps.logger ?? console;
  const { channelSecret, channelAccessToken } = getLineWebhookConfig();

  if (!channelSecret) {
    logger.error("LINE webhook configuration is missing", { stage: "config", missing: ["LINE_CHANNEL_SECRET"] });
    return { ok: false, status: 500, code: "missing_config" };
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    logger.warn("LINE webhook rejected invalid signature", { stage: "signature" });
    return { ok: false, status: 401, code: "invalid_signature" };
  }

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LineWebhookPayload;
  } catch {
    logger.warn("LINE webhook rejected invalid JSON body", { stage: "parse_json" });
    return { ok: false, status: 400, code: "invalid_json" };
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length === 0) {
    logger.info("LINE webhook verify request accepted", { stage: "verify_empty_events", eventCount: 0 });
    return { ok: true, status: 200, code: "ok" };
  }

  const missingConfig = [];
  if (!channelAccessToken) missingConfig.push("LINE_CHANNEL_ACCESS_TOKEN");
  if (missingConfig.length > 0) {
    logger.error("LINE webhook configuration is missing for event processing", { stage: "config", missing: missingConfig });
    return { ok: false, status: 500, code: "missing_config" };
  }

  const createSupabase = deps.createSupabase ?? createSupabaseAdminClient;
  const supabase = createSupabase();
  const supabaseDiagnostics = supabase ? { missing: [], invalid: [] } : getSupabaseAdminClientDiagnostics();

  logger.info("LINE webhook signature accepted; processing events", { stage: "process_events", eventCount: events.length });
  return processLineWebhookPayload(
    { events },
    {
      supabase,
      supabaseDiagnostics,
      channelAccessToken,
      fetchFn: deps.fetchFn,
      logger,
      analyzeReceipt: deps.analyzeReceipt,
      analyzeTextExpense: deps.analyzeTextExpense,
      analyzeTextIncome: deps.analyzeTextIncome,
    },
  );
}
