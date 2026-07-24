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
  "ขายหนังสือสูตร": "recipe_book_sales",
  "ขายคอร์สออนไลน์": "online_course_sales",
  "ขายคอร์สสอนสด": "live_course_sales",
  "ยอดขายหน้าร้าน": "sales_revenue",
  "รายได้แฟรนไชส์": "franchise_income",
  "รายรับอื่น": "other_income",
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

type ReceiptAnalysis = {
  merchant: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  category: string;
  confidence: number;
};

type TextExpenseAnalysis = {
  transactionDate: string;
  amount: number;
  description: string;
  paymentMethod: string;
  category: string;
};

type TextIncomeAnalysis = TextExpenseAnalysis;

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

function receiptCategory(value: unknown, merchant: string) {
  const text = String(value ?? "").trim();
  const normalizedMerchant = merchant.toLocaleLowerCase("th-TH");
  const isKvsChickenSupplier = normalizedMerchant.includes("เควีเอส เฟรชโปรดักส์")
    || normalizedMerchant.includes("kvs fresh products");

  // KVS invoices contain chicken, skin and offal. Keep this deterministic because
  // accounting categories must not depend solely on an OCR model's classification.
  if (isKvsChickenSupplier) return { code: "chicken_purchase", recognized: true };
  if (text in RECEIPT_CATEGORY_CODE_BY_LABEL) return { code: RECEIPT_CATEGORY_CODE_BY_LABEL[text], recognized: true };
  if (text in RECEIPT_CATEGORY_LABEL_BY_CODE) return { code: text, recognized: true };
  return { code: "misc_expense", recognized: false };
}

function isActualISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function canAutoSaveReceipt(analysis: ReceiptAnalysis) {
  return analysis.amount > 0
    && analysis.confidence >= RECEIPT_CONFIDENCE_THRESHOLD
    && isActualISODate(analysis.transactionDate)
    && analysis.merchant !== "ไม่ทราบชื่อร้าน"
    && analysis.paymentMethod !== "ไม่ระบุ"
    && analysis.category in RECEIPT_CATEGORY_LABEL_BY_CODE;
}

function canCreatePendingCashFlowReceipt(analysis: ReceiptAnalysis) {
  return analysis.amount > 0
    && analysis.confidence >= RECEIPT_PENDING_CONFIDENCE_THRESHOLD
    && isActualISODate(analysis.transactionDate)
    && analysis.merchant !== "ไม่ทราบชื่อร้าน"
    && analysis.paymentMethod === "ไม่ระบุ"
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

function receiptReviewReasons(analysis: ReceiptAnalysis) {
  const reasons: string[] = [];
  if (!(analysis.amount > 0)) reasons.push("ไม่พบยอดชำระ");
  if (!isActualISODate(analysis.transactionDate)) reasons.push("ไม่พบวันที่เอกสาร");
  if (analysis.merchant === "ไม่ทราบชื่อร้าน") reasons.push("ไม่พบชื่อร้าน");
  if (analysis.paymentMethod === "ไม่ระบุ") reasons.push("ไม่พบวิธีชำระเงิน");
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
      max_completion_tokens: 300,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "receipt_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              merchant: { type: "string" },
              transactionDate: { type: "string", description: "วันที่บนบิลรูปแบบ YYYY-MM-DD" },
              amount: { type: "number", description: "ยอดชำระสุทธิ" },
              paymentMethod: { type: "string" },
              category: { type: "string", enum: Object.keys(RECEIPT_CATEGORY_CODE_BY_LABEL) },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["merchant", "transactionDate", "amount", "paymentMethod", "category", "confidence"],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `อ่านบิลค่าใช้จ่ายภาษาไทย แยก merchant, transactionDate, amount, paymentMethod, category และ confidence. รายการไก่ เนื้อไก่ หนังไก่ หรือเครื่องในไก่ให้จัด category เป็นไก่สด. หากไม่เห็นวันที่ให้ใช้ ${thailandDate(eventAt)} และตั้ง confidence ต่ำกว่า ${RECEIPT_CONFIDENCE_THRESHOLD}`,
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
  const transactionDate = String(parsed.transactionDate ?? "").trim();
  const category = receiptCategory(parsed.category, merchant);
  const hasCompleteFields = Boolean(
    merchant
    && paymentMethod
    && Number.isFinite(amount)
    && amount > 0
    && isActualISODate(transactionDate)
    && category.recognized,
  );
  const confidence = hasCompleteFields
    ? reportedConfidence
    : Math.min(reportedConfidence, MAX_INCOMPLETE_RECEIPT_CONFIDENCE);

  return {
    merchant: merchant || "ไม่ทราบชื่อร้าน",
    transactionDate: isActualISODate(transactionDate) ? transactionDate : thailandDate(eventAt),
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: category.code,
    confidence,
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
        content: `แยกข้อความค่าใช้จ่ายสำหรับ Cash Flow: "${text}". คำว่า "จ่าย" หมายถึงจ่ายเงินจริงแล้ว หากไม่ระบุช่องทางให้ใช้ "ไม่ระบุ" หากไม่ระบุวันที่ให้ใช้ ${thailandDate(eventAt)} หมวดต้องเลือกจากรายการที่กำหนด`,
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
  const transactionDate = String(parsed.transactionDate ?? "").trim();
  const category = receiptCategory(parsed.category, "");

  if (!(Number.isFinite(amount) && amount > 0 && description && category.recognized)) {
    throw new Error("Cash Flow text does not contain a valid expense");
  }

  return {
    transactionDate: isActualISODate(transactionDate) ? transactionDate : thailandDate(eventAt),
    amount,
    description,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: category.code,
  };
}

function looksLikeIncomeCommand(value: string) {
  return /^\s*ขาย/u.test(value) && /\d/.test(value);
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
        content: `แยกข้อความขายสดที่รับเงินแล้วสำหรับ Cash Flow: "${text}". คำนวณสมการจำนวนคูณราคา เช่น 68*50=3400 และใช้ยอดหลังเครื่องหมายเท่ากับ หากไม่ระบุช่องทางให้ใช้ "ไม่ระบุ" หากไม่ระบุวันที่ให้ใช้ ${thailandDate(eventAt)} สินค้าที่ไม่ตรงหมวดเฉพาะให้ใช้รายรับอื่น`,
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
  const transactionDate = String(parsed.transactionDate ?? "").trim();

  if (!(Number.isFinite(amount) && amount > 0 && description)) {
    throw new Error("Cash Flow sales text does not contain a valid received amount");
  }

  return {
    transactionDate: isActualISODate(transactionDate) ? transactionDate : thailandDate(eventAt),
    amount,
    description,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category: incomeCategory(parsed.category),
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
) {
  const processed = Boolean(analysis && canAutoSaveReceipt(analysis));
  const receiptPayload = {
    message_id: safeMessageId(event),
    line_user_id: event.source?.userId ?? null,
    message_type: event.message?.type ?? "unknown",
    event_at: eventDate(event.timestamp),
    processing_status: processed || cashFlowEntryId ? "processed" : imageStoragePath ? "pending_review" : "message_received",
    image_storage_path: imageStoragePath,
    extracted_data: analysis ?? null,
    confidence: analysis?.confidence ?? null,
    cash_flow_entry_id: cashFlowEntryId ?? null,
    processing_error: analysis && !processed ? receiptReviewReasons(analysis).join("; ") || "ข้อมูลยังไม่ครบถ้วน" : null,
  };
  const { error } = await supabase.from("line_bill_receipts").insert(receiptPayload);

  if (error) {
    if (error.code === "23505") {
      if (analysis) {
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
) {
  const sourceRefId = `line:${safeMessageId(event)}`;
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
        const cashFlowEntryId = await insertCashFlowExpense(deps.supabase, event, imageStoragePath, analysis);
        const { inserted } = await insertBillReceiptEvent(deps.supabase, event, imageStoragePath, analysis, cashFlowEntryId);

        if (inserted) {
          const saved = canAutoSaveReceipt(analysis);
          const savedPending = canCreatePendingCashFlowReceipt(analysis) && Boolean(cashFlowEntryId);
          await replyToLine(
            event.replyToken,
            saved
              ? `บันทึกค่าใช้จ่ายแล้ว\n${analysis.merchant}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nหมวด ${receiptCategoryLabel(analysis.category)}`
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
          const analysis = await (deps.analyzeTextExpense ?? analyzeCashFlowText)(messageText, eventAt, fetchFn);
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
        } else if (looksLikeIncomeCommand(messageText)) {
          const eventAt = eventDate(event.timestamp);
          const analysis = await (deps.analyzeTextIncome ?? analyzeCashFlowIncomeText)(messageText, eventAt, fetchFn);
          const cashFlowEntryId = await insertTextCashFlowIncome(deps.supabase, event, analysis);
          const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null, undefined, cashFlowEntryId);

          if (inserted) {
            await replyToLine(
              event.replyToken,
              `บันทึกรายรับเข้า Cash Flow แล้ว\n${analysis.description}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ รับแล้ว\nหมวด ${incomeCategoryLabel(analysis.category)}\nเอกสาร ไม่มีเอกสาร`,
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
