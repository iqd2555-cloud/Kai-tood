import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "./supabase-admin.ts";

const LINE_REPLY_API_URL = "https://api.line.me/v2/bot/message/reply";
const PAIRING_WINDOW_MS = 30 * 60 * 1000;
const GROUP_PRICE: Record<string, number> = { A: 65, B: 68, C: 70 };

type LineEvent = {
  type?: string;
  replyToken?: string;
  timestamp?: number;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
};

type LinePayload = { events?: LineEvent[] };

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("base64"), "base64");
  const actual = Buffer.from(signature, "base64");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseGroup(text: string | undefined) {
  const normalized = (text ?? "").trim().toUpperCase().replace(/\s+/gu, " ");
  const match = normalized.match(/^(?:กลุ่ม\s*)?([ABC])$/u);
  return match?.[1] ?? null;
}

async function reply(replyToken: string | undefined, text: string, accessToken: string) {
  if (!replyToken || !accessToken) return;
  await fetch(LINE_REPLY_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });
}

export async function handleMarinatedChickenGroupRequest(request: Request) {
  const secret = clean(process.env.LINE_CHANNEL_SECRET);
  const accessToken = clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  if (!secret || !accessToken) return { handled: false };

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-line-signature"), secret)) return { handled: false };

  let payload: LinePayload;
  try { payload = JSON.parse(rawBody) as LinePayload; } catch { return { handled: false }; }
  const events = payload.events ?? [];
  if (events.length !== 1) return { handled: false };
  const event = events[0];
  if (event.type !== "message" || event.message?.type !== "text") return { handled: false };

  const group = parseGroup(event.message.text);
  if (!group) return { handled: false };
  const lineUserId = event.source?.userId;
  if (!lineUserId) return { handled: false };

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { handled: false };
  const eventAt = new Date(event.timestamp ?? Date.now());
  const cutoff = new Date(eventAt.getTime() - PAIRING_WINDOW_MS).toISOString();

  const { data: receipts, error: receiptError } = await supabase
    .from("line_bill_receipts")
    .select("message_id,event_at,cash_flow_entry_id,extracted_data")
    .eq("line_user_id", lineUserId)
    .eq("message_type", "image")
    .not("cash_flow_entry_id", "is", null)
    .gte("event_at", cutoff)
    .lte("event_at", eventAt.toISOString())
    .order("event_at", { ascending: false })
    .limit(10);

  if (receiptError) throw new Error(`Failed to find recent LINE slip: ${receiptError.code ?? "unknown"}`);

  let target: { message_id: string; cash_flow_entry_id: string; extracted_data?: unknown } | null = null;
  for (const row of (receipts ?? []) as Array<{ message_id?: string; cash_flow_entry_id?: string; extracted_data?: unknown }>) {
    if (!row.cash_flow_entry_id || !row.message_id) continue;
    const { data: entry } = await supabase
      .from("cash_flow_entries")
      .select("id,category,amount,description,note")
      .eq("id", row.cash_flow_entry_id)
      .maybeSingle();
    if (entry?.category === "marinated_chicken_sales") {
      target = { message_id: row.message_id, cash_flow_entry_id: row.cash_flow_entry_id, extracted_data: row.extracted_data };
      break;
    }
  }

  if (!target) {
    await reply(event.replyToken, "ยังไม่พบสลิปขายไก่หมักจากผู้ส่งคนนี้ใน 30 นาทีที่ผ่านมา กรุณาส่งสลิปก่อน แล้วส่งคำว่า กลุ่ม A, กลุ่ม B หรือ กลุ่ม C ตามมา", accessToken);
    return { handled: true };
  }

  const { data: entry, error: entryError } = await supabase
    .from("cash_flow_entries")
    .select("id,amount,description,note")
    .eq("id", target.cash_flow_entry_id)
    .single();
  if (entryError || !entry) throw new Error("Failed to load marinated chicken cash flow entry");

  const amount = Number(entry.amount ?? 0);
  const unitPrice = GROUP_PRICE[group];
  const quantityKg = amount / unitPrice;
  if (!(amount > 0) || !Number.isFinite(quantityKg)) throw new Error("Invalid marinated chicken income amount");

  const roundedQuantity = Math.round(quantityKg * 1000) / 1000;
  const suspicious = Math.abs(roundedQuantity - Math.round(roundedQuantity)) > 0.001;
  const metadata = `กลุ่ม ${group} | ราคา ${unitPrice} บาท/กก. | ปริมาณ ${roundedQuantity.toLocaleString("en-US", { maximumFractionDigits: 3 })} กก.`;
  const noteBase = String(entry.note ?? "").replace(/\s*\|\s*กลุ่ม\s+[ABC].*$/u, "").trim();

  const { error: updateError } = await supabase.from("cash_flow_entries").update({
    description: `${String(entry.description ?? "ขายไก่หมัก").replace(/\s*\|\s*กลุ่ม\s+[ABC].*$/u, "").trim()} | ${metadata}`,
    note: `${noteBase}${noteBase ? " | " : ""}${metadata}${suspicious ? " | รอตรวจสอบน้ำหนัก" : ""}`,
  }).eq("id", target.cash_flow_entry_id);
  if (updateError) throw new Error(`Failed to update marinated chicken group: ${updateError.code ?? "unknown"}`);

  const extracted = target.extracted_data && typeof target.extracted_data === "object" && !Array.isArray(target.extracted_data)
    ? target.extracted_data as Record<string, unknown>
    : {};
  await supabase.from("line_bill_receipts").update({
    extracted_data: { ...extracted, customer_group: group, unit_price: unitPrice, quantity_kg: roundedQuantity },
    processing_status: suspicious ? "pending_review" : "processed",
    processing_error: suspicious ? "ยอดเงินหารราคากลุ่มแล้วได้น้ำหนักไม่เป็นกิโลเต็ม กรุณาตรวจสอบ" : null,
  }).eq("message_id", target.message_id);

  await reply(
    event.replyToken,
    suspicious
      ? `รับข้อมูลกลุ่ม ${group} แล้ว\nยอดโอน ${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nราคา ${unitPrice} บาท/กก.\nคำนวณได้ ${roundedQuantity.toLocaleString("en-US", { maximumFractionDigits: 3 })} กก.\nสถานะ รอตรวจสอบ เพราะน้ำหนักที่คำนวณได้ไม่เป็นกิโลเต็ม`
      : `บันทึกกลุ่ม ${group} แล้ว\nยอดโอน ${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท\nราคา ${unitPrice} บาท/กก.\nปริมาณ ${roundedQuantity.toLocaleString("en-US", { maximumFractionDigits: 3 })} กก.`,
    accessToken,
  );

  return { handled: true };
}
