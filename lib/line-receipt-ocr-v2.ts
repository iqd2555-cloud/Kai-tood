import { analyzeReceiptImage } from "./line-webhook";

const AUTO_SAVE_CONFIDENCE = 0.9;
const REVIEW_CONFIDENCE = 0.84;
const COST_SOURCE_CATEGORIES = new Set(["chicken_purchase", "ingredient_purchase", "seasoning_cost"]);
const EXPENSE_CATEGORIES = new Set([
  "rent_payment",
  "internet_payment",
  "chicken_purchase",
  "ingredient_purchase",
  "seasoning_cost",
  "labor_cost",
  "ice_cost",
  "transport",
  "misc_expense",
]);

type ImageInput = { contentType: string; data: Buffer };

type PurchaseItemExtraction = {
  rawName: string;
  quantity: number;
  unit: string;
  packageSize: number;
  packageUnit: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
};

type StrongExtraction = {
  merchant: string;
  transactionDate: string;
  amount: number;
  amountLabel: string;
  paymentMethod: string;
  category: string;
  documentType: "bank_transfer_slip" | "invoice_receipt" | "other";
  sourceDocumentKind: "receipt" | "tax_invoice" | "invoice" | "delivery_note" | "other";
  memo: string;
  recipientReference: string;
  senderName: string;
  recipientName: string;
  senderReference: string;
  transactionReference: string;
  items: PurchaseItemExtraction[];
  fieldConfidence: {
    merchant: number;
    transactionDate: number;
    amount: number;
    paymentMethod: number;
    category: number;
  };
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function clamp(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function amountConflict(first: number, second: number) {
  if (!(first > 0 && second > 0)) return false;
  const difference = Math.abs(first - second);
  return difference > Math.max(1, Math.min(first, second) * 0.01);
}

function cleanItems(items: PurchaseItemExtraction[] | undefined) {
  return (items ?? [])
    .map((item) => ({
      rawName: String(item.rawName ?? "").trim(),
      quantity: Math.max(0, Number(item.quantity) || 0),
      unit: String(item.unit ?? "").trim(),
      packageSize: Math.max(0, Number(item.packageSize) || 0),
      packageUnit: String(item.packageUnit ?? "").trim(),
      unitPrice: Math.max(0, Number(item.unitPrice) || 0),
      lineTotal: Math.max(0, Number(item.lineTotal) || 0),
      confidence: clamp(item.confidence),
    }))
    .filter((item) => item.rawName.length > 0);
}

async function strongReceiptExtraction(
  image: ImageInput,
  fetchFn: typeof fetch,
): Promise<StrongExtraction> {
  const apiKey = clean(process.env.OPENAI_API_KEY);
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

  const response = await fetchFn("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: clean(process.env.OPENAI_RECEIPT_MODEL_V2) || "gpt-5.6-terra",
      max_completion_tokens: 1400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "thai_financial_document_extraction_v3",
          strict: true,
          schema: {
            type: "object",
            properties: {
              merchant: { type: "string" },
              transactionDate: { type: "string", description: "YYYY-MM-DD; ถ้าไม่เห็นจริงให้เป็นข้อความว่าง" },
              amount: { type: "number", description: "ยอดที่ต้องชำระจริง/ยอดสุทธิ/ยอดรวมทั้งสิ้น ไม่ใช่ subtotal หรือ VAT; ถ้าเอกสารไม่มีราคาให้เป็น 0" },
              amountLabel: { type: "string", description: "คำกำกับยอดที่เลือก เช่น ยอดสุทธิ, Grand Total, รวมทั้งสิ้น" },
              paymentMethod: { type: "string", description: "เงินสด, โอนเงิน, บัตร หรือ ไม่ระบุ" },
              category: {
                type: "string",
                enum: [
                  "rent_payment",
                  "internet_payment",
                  "chicken_purchase",
                  "ingredient_purchase",
                  "seasoning_cost",
                  "labor_cost",
                  "ice_cost",
                  "transport",
                  "misc_expense"
                ]
              },
              documentType: { type: "string", enum: ["bank_transfer_slip", "invoice_receipt", "other"] },
              sourceDocumentKind: { type: "string", enum: ["receipt", "tax_invoice", "invoice", "delivery_note", "other"] },
              memo: { type: "string" },
              recipientReference: { type: "string" },
              senderName: { type: "string" },
              recipientName: { type: "string" },
              senderReference: { type: "string" },
              transactionReference: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    rawName: { type: "string", description: "ชื่อสินค้าตามบิล เช่น เศษ BL, ซอสฝาเขียว, น้ำตาล" },
                    quantity: { type: "number", description: "จำนวนตามบิล เช่น 30 กก. ให้ quantity=30; 6 ขวดให้ quantity=6" },
                    unit: { type: "string", description: "หน่วยจำนวน เช่น กก., กรัม, ลิตร, มล., ขวด, ถุง, ลัง" },
                    packageSize: { type: "number", description: "ขนาดต่อหน่วยบรรจุ เช่น ขวด 4.5 ลิตรให้ 4.5; ถ้าไม่เห็นให้ 0" },
                    packageUnit: { type: "string", description: "หน่วยของ packageSize เช่น ลิตร, มล., กก., กรัม; ถ้าไม่เห็นให้ว่าง" },
                    unitPrice: { type: "number", description: "ราคาต่อหน่วยที่พิมพ์บนบิล ถ้าไม่เห็นให้ 0 ห้ามคำนวณเดา" },
                    lineTotal: { type: "number", description: "ยอดรวมของบรรทัดสินค้านั้น ถ้าไม่เห็นให้ 0 ห้ามคำนวณเดา" },
                    confidence: { type: "number", minimum: 0, maximum: 1 }
                  },
                  required: ["rawName", "quantity", "unit", "packageSize", "packageUnit", "unitPrice", "lineTotal", "confidence"],
                  additionalProperties: false
                }
              },
              fieldConfidence: {
                type: "object",
                properties: {
                  merchant: { type: "number", minimum: 0, maximum: 1 },
                  transactionDate: { type: "number", minimum: 0, maximum: 1 },
                  amount: { type: "number", minimum: 0, maximum: 1 },
                  paymentMethod: { type: "number", minimum: 0, maximum: 1 },
                  category: { type: "number", minimum: 0, maximum: 1 }
                },
                required: ["merchant", "transactionDate", "amount", "paymentMethod", "category"],
                additionalProperties: false
              }
            },
            required: [
              "merchant",
              "transactionDate",
              "amount",
              "amountLabel",
              "paymentMethod",
              "category",
              "documentType",
              "sourceDocumentKind",
              "memo",
              "recipientReference",
              "senderName",
              "recipientName",
              "senderReference",
              "transactionReference",
              "items",
              "fieldConfidence"
            ],
            additionalProperties: false
          }
        }
      },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "อ่านภาพใบเสร็จรับเงิน ใบกำกับภาษี ใบแจ้งหนี้ ใบส่งสินค้า หรือสลิปธนาคารภาษาไทยอย่างละเอียดระดับบัญชี โดยเน้นข้อมูลจากภาพจริง ห้ามเดา. สำหรับเอกสารซื้อวัตถุดิบ/เครื่องปรุง ให้ดึงรายการสินค้าในตารางทุกบรรทัดลง items เพื่อใช้คำนวณต้นทุนปัจจุบัน เช่น เศษไก่ BL, เศษไก่ BB, หนังไก่, ซอสถั่วเหลือง, ซอสฝาเขียว, น้ำตาล, เกลือ, รสดี, แป้งข้าวเจ้า, แป้งทอดกรอบ. อ่านจำนวน หน่วย ขนาดบรรจุ ราคาต่อหน่วย และยอดรวมบรรทัดเท่าที่เห็นจริง ถ้าไม่เห็นราคาให้ 0 ไม่คำนวณเอง. ถ้าเป็นขวด/ถุง/ลังและเห็นขนาดต่อบรรจุ ให้ใส่ packageSize กับ packageUnit. เน้นยอดเงินจริง โดยตรวจคำว่า ยอดสุทธิ, ยอดชำระ, รวมทั้งสิ้น, Grand Total, Total และตรวจ subtotal + VAT = total เมื่อมีข้อมูล. ใบเสร็จ/ใบกำกับภาษี/ใบแจ้งหนี้ที่ไม่มีวิธีชำระเงินให้ paymentMethod เป็น ไม่ระบุ โดยไม่ลดความมั่นใจของยอด วันที่ ผู้ขาย และรายการสินค้าเพราะเหตุนี้. ใบส่งสินค้าที่ไม่มีราคาให้ sourceDocumentKind=delivery_note และ amount=0. สำหรับสลิปธนาคารให้แยกผู้โอนผู้รับและเลขอ้างอิง. ให้ confidence รายรายการตามความชัดจริง ถ้ามีหลายยอดและยังตัดสินยอดสุดท้ายไม่ได้ ให้ fieldConfidence.amount ต่ำกว่า 0.85"
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.contentType};base64,${image.data.toString("base64")}`,
              detail: "high"
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) throw new Error(`Receipt OCR v3 failed with status ${response.status}`);
  const body = await response.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal) {
    throw new Error(`Receipt OCR v3 returned an incomplete response: ${choice?.finish_reason ?? "missing"}`);
  }
  return JSON.parse(choice.message?.content ?? "{}") as StrongExtraction;
}

export async function analyzeReceiptImageV2(
  image: ImageInput,
  eventAt: string,
  fetchFn: typeof fetch = fetch,
) {
  const baseline = await analyzeReceiptImage(image, eventAt, fetchFn);
  const isCostSource = COST_SOURCE_CATEGORIES.has(baseline.category);
  if (baseline.confidence >= AUTO_SAVE_CONFIDENCE && !isCostSource) return baseline;

  let strong: StrongExtraction;
  try {
    strong = await strongReceiptExtraction(image, fetchFn);
  } catch {
    return baseline;
  }

  const items = cleanItems(strong.items);
  const amountConfidence = clamp(strong.fieldConfidence?.amount);
  const dateConfidence = clamp(strong.fieldConfidence?.transactionDate);
  const merchantConfidence = clamp(strong.fieldConfidence?.merchant);
  const categoryConfidence = clamp(strong.fieldConfidence?.category);
  const paymentConfidence = clamp(strong.fieldConfidence?.paymentMethod);
  const strongAmount = Number(strong.amount);
  const conflict = amountConflict(baseline.amount, strongAmount);

  if (conflict && amountConfidence >= 0.85) {
    return {
      ...baseline,
      confidence: Math.min(baseline.confidence, REVIEW_CONFIDENCE),
      sourceDocumentKind: strong.sourceDocumentKind,
      purchaseItems: items,
      costingEligible: false,
      costingReviewReason: "ยอดรวมเอกสารจากการอ่านสองรอบไม่ตรงกัน"
    };
  }

  const amount = amountConfidence >= 0.9 && strongAmount > 0 ? strongAmount : baseline.amount;
  const transactionDate = dateConfidence >= 0.85 && isIsoDate(strong.transactionDate)
    ? strong.transactionDate
    : baseline.transactionDate;
  const merchant = merchantConfidence >= 0.85 && strong.merchant.trim()
    ? strong.merchant.trim()
    : baseline.merchant;
  const category = categoryConfidence >= 0.85 && EXPENSE_CATEGORIES.has(strong.category)
    ? strong.category
    : baseline.category;
  const documentType = strong.documentType !== "other" ? strong.documentType : baseline.documentType;
  const paymentMethod = paymentConfidence >= 0.8 && strong.paymentMethod.trim()
    ? strong.paymentMethod.trim()
    : baseline.paymentMethod;
  const criticalConfidence = Math.min(
    amountConfidence || baseline.confidence,
    dateConfidence || baseline.confidence,
    merchantConfidence || baseline.confidence,
    categoryConfidence || baseline.confidence
  );

  const invoiceComplete = documentType === "invoice_receipt"
    && amount > 0
    && isIsoDate(transactionDate)
    && merchant !== "ไม่ทราบชื่อร้าน"
    && EXPENSE_CATEGORIES.has(category)
    && criticalConfidence >= 0.88;
  const transferComplete = documentType === "bank_transfer_slip"
    && amount > 0
    && isIsoDate(transactionDate)
    && paymentMethod.includes("โอน")
    && merchant !== "ไม่ทราบชื่อร้าน"
    && amountConfidence >= 0.9
    && dateConfidence >= 0.85
    && merchantConfidence >= 0.85;
  const confidence = invoiceComplete || transferComplete
    ? Math.max(baseline.confidence, Math.min(0.97, criticalConfidence + 0.05))
    : Math.max(baseline.confidence, Math.min(REVIEW_CONFIDENCE, criticalConfidence));

  const costCategory = COST_SOURCE_CATEGORIES.has(category);
  const costingEligible = costCategory
    && isIsoDate(transactionDate)
    && merchant !== "ไม่ทราบชื่อร้าน"
    && items.length > 0
    && !conflict;

  return {
    ...baseline,
    merchant,
    transactionDate,
    amount,
    paymentMethod: paymentMethod || "ไม่ระบุ",
    category,
    confidence,
    documentType,
    memo: strong.memo?.trim() || baseline.memo,
    recipientReference: strong.recipientReference?.trim() || baseline.recipientReference,
    senderName: strong.senderName?.trim() || baseline.senderName,
    recipientName: strong.recipientName?.trim() || baseline.recipientName,
    senderReference: strong.senderReference?.trim() || baseline.senderReference,
    transactionReference: strong.transactionReference?.trim() || baseline.transactionReference,
    sourceDocumentKind: strong.sourceDocumentKind,
    purchaseItems: items,
    costingEligible,
    costingReviewReason: costingEligible ? "" : "ข้อมูลรายการซื้อยังไม่ครบสำหรับปรับต้นทุนอัตโนมัติ"
  };
}
