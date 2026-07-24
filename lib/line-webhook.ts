import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient, getSupabaseAdminClientDiagnostics } from "./supabase-admin.ts";

type LineMessage = {
  id?: string;
  type?: string;
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
};

const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_CONTENT_API_BASE_URL = "https://api-data.line.me/v2/bot/message";
const BILL_IMAGE_BUCKET = "line-bill-receipts";
const RECEIPT_CONFIDENCE_THRESHOLD = 0.9;

type ReceiptAnalysis = {
  merchant: string;
  transactionDate: string;
  amount: number;
  paymentMethod: string;
  category: string;
  confidence: number;
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

function receiptCategory(value: unknown) {
  const text = String(value ?? "").trim();
  const allowed = ["ค่าเช่าที่", "อินเทอร์เน็ต", "ไก่สด", "ข้าวเหนียว", "เครื่องปรุง", "ค่าแรง", "น้ำแข็ง", "ขนส่ง", "อื่นๆ"];
  return allowed.includes(text) ? text : "อื่นๆ";
}

function validDate(value: unknown, fallback: string) {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
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
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `อ่านบิลค่าใช้จ่ายภาษาไทย ตอบ JSON เท่านั้น: merchant, transactionDate (YYYY-MM-DD), amount (ยอดชำระสุทธิ), paymentMethod, category, confidence (0-1). category ต้องเป็นหนึ่งใน ค่าเช่าที่, อินเทอร์เน็ต, ไก่สด, ข้าวเหนียว, เครื่องปรุง, ค่าแรง, น้ำแข็ง, ขนส่ง, อื่นๆ หากไม่เห็นวันที่ให้ใช้ ${eventAt.slice(0, 10)} และลด confidence`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${image.contentType};base64,${image.data.toString("base64")}` },
          },
        ],
      }],
    }),
  });

  if (!response.ok) throw new Error(`Receipt OCR failed with status ${response.status}`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const amount = Number(parsed.amount);
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

  return {
    merchant: String(parsed.merchant ?? "").trim() || "ไม่ทราบชื่อร้าน",
    transactionDate: validDate(parsed.transactionDate, eventAt.slice(0, 10)),
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    paymentMethod: String(parsed.paymentMethod ?? "").trim() || "ไม่ระบุ",
    category: receiptCategory(parsed.category),
    confidence,
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
  const processed = Boolean(analysis && analysis.amount > 0 && analysis.confidence >= RECEIPT_CONFIDENCE_THRESHOLD);
  const { error } = await supabase.from("line_bill_receipts").insert({
    message_id: safeMessageId(event),
    line_user_id: event.source?.userId ?? null,
    message_type: event.message?.type ?? "unknown",
    event_at: eventDate(event.timestamp),
    processing_status: processed ? "processed" : imageStoragePath ? "pending_review" : "message_received",
    image_storage_path: imageStoragePath,
    extracted_data: analysis ?? null,
    confidence: analysis?.confidence ?? null,
    cash_flow_entry_id: cashFlowEntryId ?? null,
    processing_error: analysis && !processed ? "ข้อมูลจากภาพไม่ชัดเจนหรือไม่พบยอดชำระ" : null,
  });

  if (error) {
    if (error.code === "23505") return { inserted: false };
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
  if (analysis.amount <= 0 || analysis.confidence < RECEIPT_CONFIDENCE_THRESHOLD) return null;

  const { data, error } = await supabase.from("cash_flow_entries").insert({
    transaction_date: analysis.transactionDate,
    type: "expense",
    status: "paid",
    category: analysis.category,
    description: analysis.merchant,
    amount: analysis.amount,
    payment_method: analysis.paymentMethod,
    source: "other",
    source_ref_id: `line:${safeMessageId(event)}`,
    attachment_url: imageStoragePath,
    note: `บันทึกอัตโนมัติจาก LINE OA (ความมั่นใจ ${Math.round(analysis.confidence * 100)}%)`,
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

async function uploadBillImage(supabase: NonNullable<SupabaseClient>, messageId: string, image: { contentType: string; data: Buffer }) {
  const extension = image.contentType.includes("png") ? "png" : image.contentType.includes("webp") ? "webp" : "jpg";
  const path = `line/${new Date().toISOString().slice(0, 10)}/${messageId}.${extension}`;
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
        const imageStoragePath = await uploadBillImage(deps.supabase, safeMessageId(event), image);
        const analysis = await (deps.analyzeReceipt ?? analyzeReceiptImage)(image, eventDate(event.timestamp), fetchFn);
        const cashFlowEntryId = await insertCashFlowExpense(deps.supabase, event, imageStoragePath, analysis);
        const { inserted } = await insertBillReceiptEvent(deps.supabase, event, imageStoragePath, analysis, cashFlowEntryId);

        if (inserted) {
          const saved = analysis.amount > 0 && analysis.confidence >= RECEIPT_CONFIDENCE_THRESHOLD;
          await replyToLine(
            event.replyToken,
            saved
              ? `บันทึกค่าใช้จ่ายแล้ว\n${analysis.merchant}\n${analysis.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nหมวด ${analysis.category}`
              : "ได้รับรูปบิลแล้ว แต่ข้อมูลไม่ชัดเจน จึงยังไม่บันทึกยอดและเก็บไว้รอตรวจสอบ",
            deps.channelAccessToken,
            fetchFn,
          );
        }
      } else if (event.message?.type === "text") {
        const { inserted } = await insertBillReceiptEvent(deps.supabase, event, null);

        if (inserted) {
          await replyToLine(event.replyToken, "กรุณาส่งรูปบิลหรือใบเสร็จเพื่อบันทึกค่าใช้จ่าย", deps.channelAccessToken, fetchFn);
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
    },
  );
}
