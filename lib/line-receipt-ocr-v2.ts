import { analyzeReceiptImage } from "./line-webhook";

const AUTO_SAVE_CONFIDENCE = 0.9;
const REVIEW_CONFIDENCE = 0.84;
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

type StrongExtraction = {
  merchant: string;
  transactionDate: string;
  amount: number;
  amountLabel: string;
  paymentMethod: string;
  category: string;
  documentType: "bank_transfer_slip" | "invoice_receipt" | "other";
  memo: string;
  recipientReference: string;
  senderName: string;
  recipientName: string;
  senderReference: string;
  transactionReference: string;
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
      max_completion_tokens: 700,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "thai_financial_document_extraction_v2",
          strict: true,
          schema: {
            type: "object",
            properties: {
              merchant: { type: "string" },
              transactionDate: { type: "string", description: "YYYY-MM-DD; ถ้าไม่เห็นจริงให้เป็นข้อความว่าง" },
              amount: { type: "number", description: "ยอดที่ต้องชำระจริง/ยอดสุทธิ/ยอดรวมทั้งสิ้น ไม่ใช่ subtotal หรือ VAT" },
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
                  "misc_expense",
                ],
              },
              documentType: { type: "string", enum: ["bank_transfer_slip", "invoice_receipt", "other"] },
              memo: { type: "string" },
              recipientReference: { type: "string" },
              senderName: { type: "string" },
              recipientName: { type: "string" },
              senderReference: { type: "string" },
              transactionReference: { type: "string" },
              fieldConfidence: {
                type: "object",
                properties: {
                  merchant: { type: "number", minimum: 0, maximum: 1 },
                  transactionDate: { type: "number", minimum: 0, maximum: 1 },
                  amount: { type: "number", minimum: 0, maximum: 1 },
                  paymentMethod: { type: "number", minimum: 0, maximum: 1 },
                  category: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["merchant", "transactionDate", "amount", "paymentMethod", "category"],
                additionalProperties: false,
              },
            },
            required: [
              "merchant",
              "transactionDate",
              "amount",
              "amountLabel",
              "paymentMethod",
              "category",
              "documentType",
              "memo",
              "recipientReference",
              "senderName",
              "recipientName",
              "senderReference",
              "transactionReference",
              "fieldConfidence",
            ],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "อ่านภาพเอกสารการเงินภาษาไทยอย่างละเอียดระดับบัญชี โดยเน้นยอดเงินจริงเป็นอันดับแรก ตรวจคำว่า ยอดสุทธิ, ยอดชำระ, รวมทั้งสิ้น, Grand Total, Total และตรวจความสัมพันธ์ subtotal + VAT = total เมื่อมีข้อมูล อย่าเลือกยอด VAT หรือยอดก่อนภาษีแทนยอดสุทธิ สำหรับใบเสร็จ/ใบกำกับภาษี/ใบแจ้งหนี้ที่ไม่มีวิธีชำระเงิน ให้ paymentMethod เป็น ไม่ระบุ แต่ห้ามลดความมั่นใจของยอดเงิน วันที่ ชื่อผู้ขาย และหมวดเพราะเหตุนี้ สำหรับสลิปธนาคารให้แยกผู้โอนกับผู้รับและเลขอ้างอิงให้ชัด ให้คะแนน fieldConfidence แยกแต่ละช่องตามสิ่งที่เห็นจริงในภาพ ถ้ามีหลายยอดและยังตัดสินยอดสุดท้ายไม่ได้ ให้ confidence ของ amount ต่ำกว่า 0.85",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${image.contentType};base64,${image.data.toString("base64")}`,
              detail: "high",
            },
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Receipt OCR v2 failed with status ${response.status}`);
  }

  const body = await response.json() as {
    choices?: Array<{ finish_reason?: string; message?: { content?: string; refusal?: string | null } }>;
  };
  const choice = body.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal) {
    throw new Error(`Receipt OCR v2 returned an incomplete response: ${choice?.finish_reason ?? "missing"}`);
  }

  return JSON.parse(choice.message?.content ?? "{}") as StrongExtraction;
}

export async function analyzeReceiptImageV2(
  image: ImageInput,
  eventAt: string,
  fetchFn: typeof fetch = fetch,
) {
  const baseline = await analyzeReceiptImage(image, eventAt, fetchFn);
  if (baseline.confidence >= AUTO_SAVE_CONFIDENCE) return baseline;

  let strong: StrongExtraction;
  try {
    strong = await strongReceiptExtraction(image, fetchFn);
  } catch {
    // Never make the existing OCR less reliable because a second pass failed.
    return baseline;
  }

  const amountConfidence = clamp(strong.fieldConfidence?.amount);
  const dateConfidence = clamp(strong.fieldConfidence?.transactionDate);
  const merchantConfidence = clamp(strong.fieldConfidence?.merchant);
  const categoryConfidence = clamp(strong.fieldConfidence?.category);
  const paymentConfidence = clamp(strong.fieldConfidence?.paymentMethod);

  const strongAmount = Number(strong.amount);
  const conflict = amountConflict(baseline.amount, strongAmount);
  if (conflict && amountConfidence >= 0.85) {
    // Conflicting monetary totals are the one case where automation must stop.
    return { ...baseline, confidence: Math.min(baseline.confidence, REVIEW_CONFIDENCE) };
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
    categoryConfidence || baseline.confidence,
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
  };
}
