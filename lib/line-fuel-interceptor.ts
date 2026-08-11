import { createSupabaseAdminClient } from "./supabase-admin.ts";
import { analyzeReceiptImage, getLineWebhookConfig, verifyLineSignature } from "./line-webhook.ts";

const LINE_CONTENT_API_BASE_URL = "https://api-data.line.me/v2/bot/message";
const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";
const BILL_IMAGE_BUCKET = "line-bill-receipts";
const THAILAND_TIME_ZONE = "Asia/Bangkok";

type LineEvent = {
  type?: string;
  replyToken?: string;
  timestamp?: number;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
};

type FuelInterceptResult = { handled: boolean; status?: number };

function normalize(value: string) {
  return value.replace(/[^\p{L}\p{N}]/gu, "").toLocaleLowerCase("th-TH");
}

function isFuelIdentity(merchant: string, memo = "") {
  const value = normalize(`${merchant} ${memo}`);
  return value.includes(normalize("บริษัท ปตท. น้ำมันและการค้าปลีก"))
    || value.includes("pttoilandretail")
    || value.includes(normalize("ค่าน้ำมันเชื้อเพลิง"))
    || value.includes(normalize("น้ำมันเชื้อเพลิง"))
    || value.includes(normalize("เติมน้ำมัน"))
    || value.includes(normalize("ค่าน้ำมันรถ"))
    || value.includes(normalize("น้ำมันรถยนต์"))
    || value.includes(normalize("แก๊สโซฮอล์"))
    || value.includes("gasohol")
    || value.includes("e20")
    || value.includes("e85")
    || value.includes(normalize("เบนซิน"))
    || value.includes("diesel")
    || value.includes(normalize("ดีเซล"));
}

function thailandDate(timestamp?: number) {
  const date = new Date(typeof timestamp === "number" ? timestamp : Date.now());
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: THAILAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function amountFromText(text: string) {
  const beforeBaht = text.match(/([\d,]+(?:\.\d{1,2})?)\s*บาท/u)?.[1];
  const anyNumber = beforeBaht ?? text.match(/([\d,]+(?:\.\d{1,2})?)/u)?.[1];
  if (!anyNumber) return null;
  const amount = Number(anyNumber.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

async function reply(replyToken: string | undefined, text: string, token: string) {
  if (!replyToken) return;
  const response = await fetch(LINE_REPLY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error(`LINE fuel reply failed with status ${response.status}`);
}

async function saveFuelEntry(args: {
  event: LineEvent;
  description: string;
  amount: number;
  transactionDate: string;
  paymentMethod: string;
  attachmentPath?: string | null;
  confidence?: number | null;
  extractedData: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const messageId = args.event.message?.id?.trim() ?? "";
  if (!supabase || !messageId) throw new Error("Fuel interceptor database unavailable");

  const sourceRefId = `line:${messageId}`;
  const { data: existingReceipt } = await supabase
    .from("line_bill_receipts")
    .select("cash_flow_entry_id")
    .eq("message_id", messageId)
    .maybeSingle();
  if (existingReceipt?.cash_flow_entry_id) return { duplicate: true };

  const { data: inserted, error: insertError } = await supabase
    .from("cash_flow_entries")
    .insert({
      transaction_date: args.transactionDate,
      type: "expense",
      status: "paid",
      category: "fuel_cost",
      description: args.description,
      amount: args.amount,
      payment_method: args.paymentMethod,
      source: "other",
      source_ref_id: sourceRefId,
      attachment_url: args.attachmentPath ?? null,
      document_type: args.attachmentPath ? "receipt" : "no_document",
      has_attachment: Boolean(args.attachmentPath),
      note: args.attachmentPath
        ? `บันทึกอัตโนมัติจาก LINE OA เป็นค่าน้ำมันเชื้อเพลิง${args.confidence ? ` (ความมั่นใจ ${Math.round(args.confidence * 100)}%)` : ""}`
        : "บันทึกอัตโนมัติจากข้อความ LINE OA เป็นค่าน้ำมันเชื้อเพลิง โดยไม่มีเอกสารแนบ",
    })
    .select("id")
    .maybeSingle();

  let cashFlowEntryId = inserted?.id ?? null;
  if (insertError?.code === "23505") {
    const { data } = await supabase.from("cash_flow_entries").select("id").eq("source_ref_id", sourceRefId).maybeSingle();
    cashFlowEntryId = data?.id ?? null;
  } else if (insertError) {
    throw new Error(`Fuel cash flow insert failed: ${insertError.code ?? "unknown"}`);
  }

  const receiptPayload = {
    message_id: messageId,
    line_user_id: args.event.source?.userId ?? null,
    message_type: args.event.message?.type ?? "unknown",
    event_at: new Date(args.event.timestamp ?? Date.now()).toISOString(),
    processing_status: "processed",
    image_storage_path: args.attachmentPath ?? null,
    extracted_data: { ...args.extractedData, category: "fuel_cost" },
    confidence: args.confidence ?? null,
    cash_flow_entry_id: cashFlowEntryId,
    processing_error: null,
  };
  const { error: receiptError } = await supabase.from("line_bill_receipts").upsert(receiptPayload, { onConflict: "message_id" });
  if (receiptError) throw new Error(`Fuel receipt event save failed: ${receiptError.code ?? "unknown"}`);
  return { duplicate: false };
}

async function handleImage(event: LineEvent, accessToken: string): Promise<boolean> {
  const messageId = event.message?.id?.trim();
  if (!messageId) return false;
  const contentResponse = await fetch(`${LINE_CONTENT_API_BASE_URL}/${encodeURIComponent(messageId)}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!contentResponse.ok) throw new Error(`LINE fuel image download failed with status ${contentResponse.status}`);
  const contentType = contentResponse.headers.get("content-type") || "image/jpeg";
  const data = Buffer.from(await contentResponse.arrayBuffer());
  const eventAt = new Date(event.timestamp ?? Date.now()).toISOString();
  const analysis = await analyzeReceiptImage({ contentType, data }, eventAt);
  if (!isFuelIdentity(analysis.merchant, analysis.memo ?? "")) return false;

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Fuel interceptor database unavailable");
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `line/${thailandDate(event.timestamp)}/${messageId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BILL_IMAGE_BUCKET).upload(path, data, {
    contentType,
    upsert: true,
  });
  if (uploadError) throw new Error(`Fuel image upload failed: ${uploadError.message}`);

  const saved = await saveFuelEntry({
    event,
    description: analysis.merchant || "ค่าน้ำมันเชื้อเพลิง",
    amount: analysis.amount,
    transactionDate: analysis.transactionDate || thailandDate(event.timestamp),
    paymentMethod: analysis.paymentMethod || "ไม่ระบุ",
    attachmentPath: path,
    confidence: analysis.confidence,
    extractedData: { ...analysis, category: "fuel_cost" },
  });
  if (!saved.duplicate) {
    await reply(
      event.replyToken,
      `บันทึกเข้า Cash Flow แล้ว\n${analysis.merchant || "ค่าน้ำมันเชื้อเพลิง"}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ จ่ายแล้ว\nหมวด ค่าน้ำมันเชื้อเพลิง`,
      accessToken,
    );
  }
  return true;
}

async function handleText(event: LineEvent, accessToken: string): Promise<boolean> {
  const text = event.message?.text?.trim() ?? "";
  if (!text || !isFuelIdentity(text)) return false;
  const amount = amountFromText(text);
  if (!amount) return false;
  const saved = await saveFuelEntry({
    event,
    description: text,
    amount,
    transactionDate: thailandDate(event.timestamp),
    paymentMethod: "ไม่ระบุ",
    attachmentPath: null,
    confidence: null,
    extractedData: { kind: "fuel_text_expense", text, amount, category: "fuel_cost" },
  });
  if (!saved.duplicate) {
    await reply(
      event.replyToken,
      `บันทึกเข้า Cash Flow แล้ว\n${text}\n${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nสถานะ จ่ายแล้ว\nหมวด ค่าน้ำมันเชื้อเพลิง\nเอกสาร ไม่มีเอกสาร`,
      accessToken,
    );
  }
  return true;
}

export async function handleFuelExpenseRequest(request: Request): Promise<FuelInterceptResult> {
  const { channelSecret, channelAccessToken } = getLineWebhookConfig();
  if (!channelSecret || !channelAccessToken) return { handled: false };
  const rawBody = await request.text();
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"), channelSecret)) return { handled: false };
  let payload: { events?: LineEvent[] };
  try { payload = JSON.parse(rawBody) as { events?: LineEvent[] }; } catch { return { handled: false }; }
  const events = Array.isArray(payload.events) ? payload.events : [];
  // Avoid partial handling of a LINE batch. Normal webhook processing remains authoritative for mixed batches.
  if (events.length !== 1 || events[0]?.type !== "message") return { handled: false };
  const event = events[0];
  try {
    const handled = event.message?.type === "image"
      ? await handleImage(event, channelAccessToken)
      : event.message?.type === "text"
        ? await handleText(event, channelAccessToken)
        : false;
    return { handled, status: handled ? 200 : undefined };
  } catch (error) {
    console.error("Fuel expense interceptor failed", error);
    return { handled: false };
  }
}
