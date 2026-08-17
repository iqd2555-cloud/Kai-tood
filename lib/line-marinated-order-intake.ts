import { createHmac, timingSafeEqual } from "node:crypto";
import { CUSTOMER_MASTER, MARINATED_PRODUCTS, parseMarinatedOrder, priceOrder } from "./marinated-order-parser.ts";
import { createSupabaseAdminClient } from "./supabase-admin.ts";

const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_API_BASE_URL = "https://api.line.me/v2/bot";

type LineSource = {
  type?: "user" | "group" | "room";
  userId?: string;
  groupId?: string;
  roomId?: string;
};

type LineEvent = {
  type?: string;
  webhookEventId?: string;
  replyToken?: string;
  timestamp?: number;
  source?: LineSource;
  message?: { id?: string; type?: string; text?: string };
};

type SourceIdentity = {
  sourceType: "user";
  sourceId: string;
  groupId: string;
};

type IntakeResult = { handled: boolean; status?: number };
type SupabaseAdmin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("base64"), "base64");
  const actual = Buffer.from(signature, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sourceIdentity(source: LineSource | undefined): SourceIdentity | null {
  if (source?.type === "group" && source.groupId && source.userId) {
    return { sourceType: "user", sourceId: source.userId, groupId: source.groupId };
  }
  return null;
}

function aliasesPattern() {
  return Object.values(MARINATED_PRODUCTS)
    .flatMap((product) => product.aliases)
    .sort((left, right) => right.length - left.length)
    .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

const ORDER_ITEM_PATTERN = new RegExp(
  `(?:${aliasesPattern()})\\s*[:=]?\\s*\\d+(?:\\.\\d+)?\\s*(?:ก\\s*\\.\\s*ก\\.?|กก|กิโล(?:กรัม)?|โล)?`,
  "iu",
);

export function looksLikeMarinatedOrderMessage(text: string) {
  const normalized = text.trim();
  if (!normalized) return false;
  if (ORDER_ITEM_PATTERN.test(normalized)) return true;
  return /(?:^|\s)ไก่\s*[:=]?\s*\d+(?:\.\d+)?\s*(?:ก\s*\.\s*ก\.?|กก|กิโล(?:กรัม)?|โล)?/iu.test(normalized)
    && /(?:รอบ(?:จัด)?ส่ง|ส่ง(?:ของ)?(?:วันที่)?|รอบจัดส่ง)/iu.test(normalized);
}

async function lineJson(path: string, accessToken: string) {
  try {
    const response = await fetch(`${LINE_API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return await response.json() as Record<string, unknown>;
  } catch {
    // Profile names help the Owner identify the sender, but an unavailable
    // profile endpoint must not prevent the order itself from being captured.
    return null;
  }
}

async function sourceDisplayName(event: LineEvent, identity: SourceIdentity, accessToken: string) {
  const userId = event.source?.userId;
  const [group, member] = await Promise.all([
    lineJson(`/group/${encodeURIComponent(identity.groupId)}/summary`, accessToken),
    userId ? lineJson(`/group/${encodeURIComponent(identity.groupId)}/member/${encodeURIComponent(userId)}`, accessToken) : null,
  ]);
  const groupName = typeof group?.groupName === "string" ? group.groupName : "กลุ่ม LINE";
  const memberName = typeof member?.displayName === "string" ? member.displayName : "";
  return memberName ? `${groupName} · ${memberName}` : groupName;
}

async function reply(replyToken: string | undefined, text: string, accessToken: string) {
  if (!replyToken) return;
  const response = await fetch(LINE_REPLY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
  if (!response.ok) throw new Error(`LINE order reply failed with status ${response.status}`);
}

async function insertInbox(
  supabase: SupabaseAdmin,
  event: LineEvent,
  identity: SourceIdentity,
  displayName: string | null,
  rawMessage: string,
  status: "unmatched_customer" | "needs_review",
  customerMasterId: string | null,
  errors: string[],
  warnings: string[],
) {
  const messageId = event.message?.id?.trim() ?? "";
  const webhookEventId = event.webhookEventId?.trim() || `message:${messageId}`;
  const { data, error } = await supabase.from("marinated_order_line_inbox").insert({
    webhook_event_id: webhookEventId,
    message_id: messageId,
    source_type: identity.sourceType,
    source_id: identity.sourceId,
    line_user_id: event.source?.userId ?? null,
    display_name: displayName,
    raw_message: rawMessage,
    event_at: new Date(event.timestamp ?? Date.now()).toISOString(),
    processing_status: status,
    customer_master_id: customerMasterId,
    parser_errors: errors,
    parser_warnings: warnings,
    metadata: { source_type: identity.sourceType, chat_type: "group", group_id: identity.groupId },
  }).select("id").maybeSingle();

  if (error?.code === "23505") return { id: null, duplicate: true };
  if (error || !data?.id) throw new Error(`LINE order inbox insert failed: ${error?.code ?? "unknown"}`);
  return { id: String(data.id), duplicate: false };
}

async function createDraft(
  supabase: SupabaseAdmin,
  inboxId: string,
  rawMessage: string,
  customerMasterId: string,
) {
  const customer = CUSTOMER_MASTER.find((item) => item.id === customerMasterId);
  if (!customer) throw new Error(`Unknown customer master id: ${customerMasterId}`);
  const parsed = parseMarinatedOrder(rawMessage, customer);
  if (parsed.needsReview || !parsed.deliveryDateISO || parsed.items.length === 0) {
    return { orderId: null, orderNumber: null, parsed };
  }

  const pricing = priceOrder(parsed, customer);
  const { data: orderId, error } = await supabase.rpc("create_marinated_order_draft_from_line", {
    p_inbox_id: inboxId,
    p_customer_master_id: customer.id,
    p_customer_name: customer.name,
    p_customer_group: customer.group,
    p_customer_phone: customer.phone ?? "",
    p_customer_address: customer.address ?? "",
    p_shipping_instruction: customer.shippingInstruction ?? "",
    p_raw_message: rawMessage,
    p_delivery_date: parsed.deliveryDateISO,
    p_price_per_kg: pricing.pricePerKg,
    p_items: parsed.items.map((item) => ({ product: item.product, name: item.name, kg: item.kg })),
  });
  if (error || !orderId) throw new Error(`LINE order draft creation failed: ${error?.code ?? "unknown"}`);

  const { data: order } = await supabase
    .from("marinated_orders")
    .select("order_number")
    .eq("id", orderId)
    .maybeSingle();
  return { orderId: String(orderId), orderNumber: String(order?.order_number ?? ""), parsed };
}

async function processOrderEvent(event: LineEvent, accessToken: string, supabase: SupabaseAdmin) {
  const rawMessage = event.message?.text?.trim() ?? "";
  const identity = sourceIdentity(event.source);
  if (!identity || !event.message?.id || !looksLikeMarinatedOrderMessage(rawMessage)) return false;

  const { data: mapping, error: mappingError } = await supabase
    .from("marinated_order_line_sources")
    .select("customer_master_id,display_name")
    .eq("source_type", identity.sourceType)
    .eq("source_id", identity.sourceId)
    .maybeSingle();
  if (mappingError) throw new Error(`LINE order source lookup failed: ${mappingError.code ?? "unknown"}`);

  const displayName = String(mapping?.display_name ?? "").trim()
    || await sourceDisplayName(event, identity, accessToken)
    || null;
  const customerMasterId = typeof mapping?.customer_master_id === "string" ? mapping.customer_master_id : null;

  if (!customerMasterId) {
    const preliminary = parseMarinatedOrder(rawMessage);
    const inbox = await insertInbox(
      supabase,
      event,
      identity,
      displayName,
      rawMessage,
      "unmatched_customer",
      null,
      preliminary.errors,
      preliminary.warnings,
    );
    if (!inbox.duplicate) {
      await reply(event.replyToken, "รับข้อความออเดอร์แล้ว\nระบบส่งให้เจ้าของร้านผูกบัญชี LINE ของผู้ส่งกับลูกค้าครั้งแรก เมื่อผูกแล้วออเดอร์ครั้งต่อไปของผู้ส่งคนนี้จะเข้า Draft อัตโนมัติ", accessToken);
    }
    return true;
  }

  const customer = CUSTOMER_MASTER.find((item) => item.id === customerMasterId);
  if (!customer) throw new Error(`LINE order source uses unknown customer: ${customerMasterId}`);
  const parsed = parseMarinatedOrder(rawMessage, customer);
  const inbox = await insertInbox(
    supabase,
    event,
    identity,
    displayName,
    rawMessage,
    "needs_review",
    customer.id,
    parsed.errors,
    parsed.warnings,
  );
  if (inbox.duplicate || !inbox.id) return true;

  if (parsed.needsReview) {
    await reply(
      event.replyToken,
      `รับข้อความแล้ว แต่ยังสร้าง Draft ไม่ได้\n${parsed.errors.slice(0, 3).map((item) => `- ${item}`).join("\n")}\nเจ้าของร้านจะตรวจสอบอีกครั้ง`,
      accessToken,
    );
    return true;
  }

  const created = await createDraft(supabase, inbox.id, rawMessage, customer.id);
  await reply(
    event.replyToken,
    `รับออเดอร์แล้ว${created.orderNumber ? ` (${created.orderNumber})` : ""}\nรวม ${created.parsed.totalKg.toLocaleString("th-TH")} กก.\nสถานะ Draft รอเจ้าของร้านตรวจและยืนยัน`,
    accessToken,
  );
  return true;
}

export async function handleLineMarinatedOrderIntakeRequest(request: Request): Promise<IntakeResult> {
  const channelSecret = clean(process.env.LINE_CHANNEL_SECRET);
  const accessToken = clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!channelSecret || !accessToken) return { handled: false };

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-line-signature"), channelSecret)) return { handled: false };

  let payload: { events?: LineEvent[] };
  try {
    payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  } catch {
    return { handled: false };
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length !== 1 || events[0]?.type !== "message" || events[0]?.message?.type !== "text") {
    return { handled: false };
  }

  const event = events[0];
  // Order automation is intentionally group-only. Direct chats with the OA keep
  // their existing receipt and Cash Flow behavior without order interception.
  if (event.source?.type !== "group" || !event.source.groupId) return { handled: false };
  if (!looksLikeMarinatedOrderMessage(event.message?.text ?? "")) return { handled: false };
  if (!event.source.userId) {
    console.warn("LINE group order ignored because the sender user ID is unavailable", {
      messageId: event.message?.id,
      groupId: event.source.groupId,
    });
    return { handled: true, status: 200 };
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) return { handled: false };

  try {
    const handled = await processOrderEvent(event, accessToken, supabase);
    return { handled, status: handled ? 200 : undefined };
  } catch (error) {
    console.error("LINE marinated order intake failed", error);
    // The message matched the order grammar. Do not fall through to the Cash Flow
    // parser on failure; return 500 so LINE can redeliver the same idempotent event.
    return { handled: true, status: 500 };
  }
}
