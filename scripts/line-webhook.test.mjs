import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  analyzeCashFlowIncomeText,
  analyzeReceiptImage,
  handleLineWebhookRequest,
  processLineWebhookPayload,
  verifyLineSignature,
} from "../lib/line-webhook.ts";
import { createSupabaseAdminClient, getSupabaseAdminClientDiagnostics } from "../lib/supabase-admin.ts";

function sign(body, secret) {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function createSupabaseMock({ insertError = null, uploadError = null, updateError = null } = {}) {
  const insertedRows = [];
  const cashFlowRows = [];
  const uploadedFiles = [];
  const updatedRows = [];

  function selectRows(rows) {
    let selected = [...rows];
    const builder = {
      eq(column, value) {
        selected = selected.filter((row) => row[column] === value);
        return builder;
      },
      gte(column, value) {
        selected = selected.filter((row) => row[column] >= value);
        return builder;
      },
      lte(column, value) {
        selected = selected.filter((row) => row[column] <= value);
        return builder;
      },
      order(column, { ascending = true } = {}) {
        selected.sort((left, right) => {
          const comparison = String(left[column] ?? "").localeCompare(String(right[column] ?? ""));
          return ascending ? comparison : -comparison;
        });
        return builder;
      },
      limit(count) {
        return Promise.resolve({ data: selected.slice(0, count), error: null });
      },
      maybeSingle() {
        return Promise.resolve({ data: selected[0] ?? null, error: null });
      },
    };
    return builder;
  }

  return {
    insertedRows,
    cashFlowRows,
    uploadedFiles,
    updatedRows,
    from(table) {
      return {
        select() {
          if (table === "line_bill_receipts") return selectRows(insertedRows);
          assert.equal(table, "cash_flow_entries");
          return selectRows(cashFlowRows);
        },
        insert(row) {
          if (table === "line_bill_receipts") {
            insertedRows.push(row);
            return Promise.resolve({ error: insertError });
          }
          assert.equal(table, "cash_flow_entries");
          cashFlowRows.push(row);
          return {
            select() {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: { id: "cash-flow-entry-1" }, error: null });
                },
              };
            },
          };
        },
        update(row) {
          assert.equal(table, "line_bill_receipts");
          return {
            eq(column, value) {
              updatedRows.push({ row, column, value });
              if (!updateError) {
                for (const existing of insertedRows) {
                  if (existing[column] === value) Object.assign(existing, row);
                }
              }
              return Promise.resolve({ error: updateError });
            },
          };
        },
      };
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "line-bill-receipts");
        return {
          upload(path, data, options) {
            uploadedFiles.push({ path, data, options });
            return Promise.resolve({ error: uploadError });
          },
        };
      },
    },
  };
}

const successfulAnalysis = async () => ({
  merchant: "ร้านทดสอบ",
  transactionDate: "2026-07-22",
  amount: 125.5,
  paymentMethod: "โอนเงิน",
  category: "seasoning_cost",
  confidence: 0.95,
});

const marinatedChickenIncomeExamples = [
  { senderName: "นาย พงษ์เทพ พ", senderReference: "xxx-x-x3556-x", amount: 3250 },
  { senderName: "น.ส. นงนุช จ", senderReference: "xxx-x-x6179-x", amount: 2925 },
  { senderName: "น.ส. พัชรี แ", senderReference: "xxx-x-x8946-x", amount: 3060 },
  { senderName: "นาย วินัย เ.", senderReference: "xxx-xxx664-7", amount: 3060 },
  { senderName: "นาง วาสนา ชื่นใจ", senderReference: "xxx-x-xx183-0", amount: 3060 },
  { senderName: "นางวาสนา ช***", senderReference: "xxx-x-xx262-6", amount: 3060 },
  { senderName: "น.ส. หิรัญญา ภ", senderReference: "xxx-x-x7032-x", amount: 3060 },
  { senderName: "นายไผ่ชู ย***", senderReference: "xxx-x-xx886-2", amount: 3150 },
  { senderName: "น.ส. โอชิระ ย***", senderReference: "xxx-x-xx450-1", amount: 3150 },
  { senderName: "น.ส. จินตณี", senderReference: "593-0-xxx084", amount: 2925 },
];

function createSignedRequest(body, secret, signature = sign(body, secret)) {
  return new Request("https://kai-tood.test/api/line/webhook", {
    method: "POST",
    headers: { "x-line-signature": signature, "content-type": "application/json" },
    body,
  });
}

function withEnv(env, fn) {
  const previous = {};
  for (const key of Object.keys(env)) {
    previous[key] = process.env[key];
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }

  return Promise.resolve(fn()).finally(() => {
    for (const key of Object.keys(env)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

function createFetchMock() {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    calls.push({ url: String(url), init });

    if (String(url).includes("/content")) {
      return new Response(Buffer.from("fake-image"), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
    }

    return Response.json({}, { status: 200 });
  };

  fetchFn.calls = calls;
  return fetchFn;
}

const secret = "test-channel-secret";
const body = JSON.stringify({ events: [] });
assert.equal(verifyLineSignature(body, sign(body, secret), secret), true, "valid signature passes");
assert.equal(verifyLineSignature(body, "invalid", secret), false, "invalid signature fails");
assert.equal(verifyLineSignature(body, null, secret), false, "missing signature fails");

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          transactionDate: "2569-07-25",
          amount: 650,
          description: "ขายหนังสือสูตรไก่ทอดเล่มละ 650 บาท 1 เล่ม",
          paymentMethod: "ไม่ระบุ",
          category: "ขายหนังสือ",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeCashFlowIncomeText(
      "ขายหนังสือสูตรไก่ทอดเล่มละ 650 บาท 1 เล่มวันที่ 25 กรกฎาคม 2569",
      "2026-07-25T23:13:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.transactionDate, "2026-07-25", "Thai Buddhist years are converted to Gregorian years");
  assert.equal(analysis.category, "recipe_book_sales");
}

{
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({
      choices: [{
        finish_reason: "stop",
        message: {
          content: JSON.stringify({
            merchant: "ร้านทดสอบ",
            transactionDate: "2026-02-30",
            amount: 125.5,
            paymentMethod: "โอนเงิน",
            category: "เครื่องปรุง",
            confidence: 0.99,
          }),
        },
      }],
    });
  };
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-image") },
      "2026-07-21T22:30:00.000Z",
      fetchFn,
    ),
  );
  const requestBody = JSON.parse(calls[0].init.body);

  assert.equal(analysis.transactionDate, "2026-07-22", "invalid or missing bill dates fall back to the Thailand event date");
  assert.equal(analysis.category, "seasoning_cost", "Thai OCR labels map to canonical Cash Flow category codes");
  assert.equal(analysis.confidence, 0.89, "fallback fields cannot pass the 90% auto-save threshold");
  assert.equal(requestBody.response_format.type, "json_schema", "OCR uses schema-constrained structured output");
  assert.equal(requestBody.messages[0].content[1].image_url.detail, "high", "receipt OCR requests high image detail");
}

for (const [index, example] of marinatedChickenIncomeExamples.entries()) {
  const transactionReference = `income-slip-reference-${index + 1}`;
  const ocrFetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "บจก. เหนียวไก่เยอะโคตร อินสไปร์",
          transactionDate: "2026-08-05",
          amount: example.amount,
          paymentMethod: "โอนเงิน",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "xxx-x-x6909-x",
          senderName: example.senderName,
          recipientName: "บจก. เหนียวไก่เยอะโคตร อินสไปร์",
          senderReference: example.senderReference,
          transactionReference,
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from(`fake-income-slip-${index}`) },
      "2026-08-05T02:09:00.000Z",
      ocrFetchFn,
    ),
  );

  assert.equal(analysis.merchant, example.senderName, `${example.senderName} is stored as the payer`);
  assert.equal(analysis.category, "marinated_chicken_sales");
  assert.equal(analysis.confidence, 0.95, "known customer transfer is eligible for automatic income recording");

  const supabase = createSupabaseMock();
  const lineFetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [{
        type: "message",
        replyToken: `reply-token-income-slip-${index}`,
        timestamp: Date.parse("2026-08-05T02:09:00.000Z"),
        source: { userId: "line-user-income-slip" },
        message: { id: `image-income-slip-${index}`, type: "image" },
      }],
    },
    {
      supabase,
      channelAccessToken: "channel-token",
      fetchFn: lineFetchFn,
      analyzeReceipt: async () => analysis,
      logger: console,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(supabase.cashFlowRows.length, 1);
  assert.equal(supabase.cashFlowRows[0].type, "income");
  assert.equal(supabase.cashFlowRows[0].status, "received");
  assert.equal(supabase.cashFlowRows[0].category, "marinated_chicken_sales");
  assert.equal(supabase.cashFlowRows[0].amount, example.amount);
  assert.match(supabase.cashFlowRows[0].description, new RegExp(example.senderName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(supabase.cashFlowRows[0].source_ref_id, `bank-slip:incomeslipreference${index + 1}`);
  assert.match(lineFetchFn.calls[1].init.body, /บันทึกรายรับเข้า Cash Flow แล้ว/);
  assert.match(lineFetchFn.calls[1].init.body, /หมวด ขายไก่หมัก/);
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "บริษัท เควีเอส เฟรชโปรดักส์ จำกัด",
          transactionDate: "2026-07-24",
          amount: 6300,
          paymentMethod: "",
          category: "ค่าเช่าที่",
          confidence: 0.95,
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-kvs-invoice") },
      "2026-07-24T15:41:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.category, "chicken_purchase", "KVS chicken invoices cannot be classified as rent");
  assert.equal(analysis.paymentMethod, "ไม่ระบุ");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "บจก. เควีเอส เฟรชโปรดักส์",
          transactionDate: "2026-07-26",
          amount: 6760,
          paymentMethod: "โอนเงิน",
          category: "ไก่สด",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "xxx-x-x7557-x",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-kvs-transfer-slip") },
      "2026-07-26T06:07:21.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.amount, 6760);
  assert.equal(analysis.category, "chicken_purchase", "KVS recipient rule locks the category to fresh chicken");
  assert.equal(analysis.merchant, "ซื้อไก่สด - บจก. เควีเอส เฟรชโปรดักส์");
  assert.equal(analysis.confidence, 0.95, "complete KVS transfer slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "น.ส. สุชาดา ธัญญผล",
          transactionDate: "2026-07-25",
          amount: 350,
          paymentMethod: "โอนเงิน",
          category: "ไก่สด",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "ค่าแรง",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-labor-bank-slip") },
      "2026-07-25T05:41:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.merchant, "น.ส. สุชาดา ธัญญผล", "bank slip stores the payee rather than the sender");
  assert.equal(analysis.category, "labor_cost", "memo ค่าแรง overrides an incorrect chicken category");
  assert.equal(analysis.paymentMethod, "โอนเงิน");
  assert.equal(analysis.documentType, "bank_transfer_slip");
  assert.equal(analysis.memo, "ค่าแรง");
  assert.equal(analysis.confidence, 0.95, "complete transfer slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "ไพรม์สุข",
          transactionDate: "2026-07-25",
          amount: 1307,
          paymentMethod: "โอนเงิน",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "Biller ID: 010753600031508",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-primesuk-bill-slip") },
      "2026-07-25T04:50:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.merchant, "ไพรม์สุข");
  assert.equal(analysis.amount, 1307);
  assert.equal(analysis.category, "seasoning_cost", "Primesuk recipient rule locks the category to seasoning");
  assert.equal(analysis.recipientReference, "Biller ID: 010753600031508");
  assert.equal(analysis.confidence, 0.95, "complete known-recipient bill slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "IMBALANCE",
          transactionDate: "2026-07-27",
          amount: 160,
          paymentMethod: "โอนเงิน",
          category: "เครื่องปรุง",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "Biller ID: 010753600031508",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-imbalance-book-shipping-slip") },
      "2026-07-27T02:36:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.amount, 160);
  assert.equal(analysis.category, "transport", "IMBALANCE recipient rule overrides a shared biller ID");
  assert.equal(analysis.merchant, "ค่าขนส่งหนังสือสูตร - IMBALANCE");
  assert.equal(analysis.confidence, 0.95, "complete IMBALANCE slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "EMBALANCE",
          transactionDate: "2026-07-27",
          amount: 160,
          paymentMethod: "โอนเงิน",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-embalance-book-shipping-slip") },
      "2026-07-27T02:36:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.category, "transport", "EMBALANCE spelling is recognized as book shipping");
  assert.equal(analysis.merchant, "ค่าขนส่งหนังสือสูตร - EMBALANCE");
  assert.equal(analysis.confidence, 0.95);
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "นาย ธีระวุฒิ พันธุ์หงษ์",
          transactionDate: "2026-07-24",
          amount: 440,
          paymentMethod: "โอนเงิน",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "xxx-x-x2375-xxx",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-teerawut-transport-slip") },
      "2026-07-24T08:40:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.amount, 440);
  assert.equal(analysis.category, "transport", "Teerawut recipient rule locks the category to transport");
  assert.equal(analysis.merchant, "ค่าขนส่งไก่ - นาย ธีระวุฒิ พันธุ์หงษ์");
  assert.equal(analysis.confidence, 0.95, "complete known-recipient transport slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "น.ส. สรวิศา เอี่ยมปฐม",
          transactionDate: "2026-07-26",
          amount: 350,
          paymentMethod: "โอนเงิน",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "xxx-x-x9875-x",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-sorawisa-labor-slip") },
      "2026-07-26T09:20:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.amount, 350);
  assert.equal(analysis.category, "labor_cost", "Sorawisa recipient rule locks the category to labor");
  assert.equal(analysis.merchant, "ค่าแรง - น.ส. สรวิศา เอี่ยมปฐม");
  assert.equal(analysis.confidence, 0.95, "complete known-recipient labor slip is eligible for automatic recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "บริษัท เทพรัญญะ (นครสวรรค์) จำกัด",
          transactionDate: "2026-07-26",
          amount: 2430,
          paymentMethod: "ไม่ระบุ",
          category: "อื่นๆ",
          confidence: 0.85,
          documentType: "invoice_receipt",
          memo: "",
          recipientReference: "",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-tax-invoice-and-receipt") },
      "2026-07-26T10:54:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.amount, 2430);
  assert.equal(analysis.documentType, "invoice_receipt");
  assert.equal(analysis.paymentMethod, "ไม่ระบุ", "the system does not invent a payment channel");
  assert.equal(analysis.category, "ingredient_purchase", "Thepphanya recipient rule locks the category to ingredients");
  assert.equal(
    analysis.merchant,
    "ค่าวัตถุดิบ - บริษัท เทพรัญญะ (นครสวรรค์) จำกัด",
    "the locked rule labels the expense consistently",
  );
  assert.equal(analysis.confidence, 0.95, "complete purchase documents are eligible for automatic paid recording");
}

{
  const fetchFn = async () => Response.json({
    choices: [{
      finish_reason: "stop",
      message: {
        content: JSON.stringify({
          merchant: "บริษัท เทพธัญญะ นครสวรรค์ จำกัด",
          transactionDate: "2026-07-26",
          amount: 2430,
          paymentMethod: "โอนเงิน",
          category: "เครื่องปรุง",
          confidence: 0.85,
          documentType: "bank_transfer_slip",
          memo: "",
          recipientReference: "",
        }),
      },
    }],
  });
  const analysis = await withEnv(
    { OPENAI_API_KEY: "test-openai-key" },
    () => analyzeReceiptImage(
      { contentType: "image/jpeg", data: Buffer.from("fake-thepphanya-bank-slip") },
      "2026-07-26T10:54:00.000Z",
      fetchFn,
    ),
  );

  assert.equal(analysis.category, "ingredient_purchase", "owner spelling also locks Thepphanya to ingredients");
  assert.equal(analysis.merchant, "ค่าวัตถุดิบ - บริษัท เทพธัญญะ นครสวรรค์ จำกัด");
  assert.equal(analysis.confidence, 0.95);
}

{
  const result = await withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    },
    () => {
      const client = createSupabaseAdminClient();
      const diagnostics = getSupabaseAdminClientDiagnostics();
      assert.notEqual(client, null, "admin client is created without requiring anon key");
      assert.deepEqual(diagnostics, { missing: [], invalid: [] });
    },
  );
  await result;
}

{
  await withEnv(
    { NEXT_PUBLIC_SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
    () => {
      const diagnostics = getSupabaseAdminClientDiagnostics();
      assert.deepEqual(diagnostics.missing.sort(), ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].sort());
      assert.deepEqual(diagnostics.invalid, []);
    },
  );
}

{
  const textBody = JSON.stringify({
    events: [
      {
        type: "message",
        replyToken: "reply-token-missing-db",
        source: { userId: "line-user-missing-db" },
        message: { id: "text-message-missing-db", type: "text" },
      },
    ],
  });
  const errors = [];
  const result = await withEnv(
    {
      LINE_CHANNEL_SECRET: secret,
      LINE_CHANNEL_ACCESS_TOKEN: "channel-token",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    () =>
      handleLineWebhookRequest(createSignedRequest(textBody, secret), {
        logger: { ...console, error: (...args) => errors.push(args) },
      }),
  );

  assert.equal(result.ok, false, "missing service role key fails event processing");
  assert.equal(result.code, "database_unavailable");
  assert.equal(JSON.stringify(errors).includes("SUPABASE_SERVICE_ROLE_KEY"), true, "missing service role key name is logged");
  assert.equal(JSON.stringify(errors).includes("channel-token"), false, "channel access token is not leaked in logs");
}


{
  const logs = [];
  const createSupabase = () => {
    throw new Error("Verify must not create Supabase client");
  };
  const result = await withEnv(
    { LINE_CHANNEL_SECRET: secret, LINE_CHANNEL_ACCESS_TOKEN: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
    () =>
      handleLineWebhookRequest(createSignedRequest(body, secret), {
        createSupabase,
        logger: { ...console, info: (...args) => logs.push(args) },
      }),
  );

  assert.equal(result.ok, true, "LINE Verify with empty events succeeds");
  assert.equal(result.status, 200, "LINE Verify returns HTTP 200");
  assert.equal(result.code, "ok");
  assert.equal(JSON.stringify(logs).includes("verify_empty_events"), true, "Verify stage is logged");
}

{
  const result = await withEnv({ LINE_CHANNEL_SECRET: secret, LINE_CHANNEL_ACCESS_TOKEN: undefined }, () =>
    handleLineWebhookRequest(createSignedRequest(body, secret, "wrong-signature"), { logger: console }),
  );

  assert.equal(result.ok, false, "invalid signature fails");
  assert.equal(result.status, 401, "invalid signature returns HTTP 401");
  assert.equal(result.code, "invalid_signature");
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const imageBody = JSON.stringify({
    events: [
      {
        type: "message",
        replyToken: "reply-token-route",
        timestamp: 1784678400000,
        source: { userId: "line-user-route" },
        message: { id: "image-message-route", type: "image" },
      },
    ],
  });
  const result = await withEnv({ LINE_CHANNEL_SECRET: secret, LINE_CHANNEL_ACCESS_TOKEN: "channel-token" }, () =>
    handleLineWebhookRequest(createSignedRequest(imageBody, secret), {
      createSupabase: () => supabase,
      fetchFn,
      analyzeReceipt: successfulAnalysis,
      logger: console,
    }),
  );

  assert.equal(result.ok, true, "valid image payload succeeds through request handler");
  assert.equal(result.status, 200);
  assert.equal(supabase.insertedRows.length, 1, "valid image payload enters bill receipt persistence");
  assert.equal(supabase.uploadedFiles.length, 1, "valid image payload downloads and uploads the image");
  assert.equal(fetchFn.calls.length, 2, "valid image payload calls content and reply APIs");
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-1",
          timestamp: 1784678400000,
          source: { userId: "line-user-1" },
          message: { id: "image-message-1", type: "image" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeReceipt: successfulAnalysis, logger: console },
  );

  assert.equal(result.ok, true, "image event succeeds");
  assert.equal(supabase.insertedRows.length, 1, "image event is persisted");
  assert.equal(supabase.insertedRows[0].message_id, "image-message-1");
  assert.equal(supabase.insertedRows[0].message_type, "image");
  assert.equal(supabase.insertedRows[0].processing_status, "processed");
  assert.equal(supabase.cashFlowRows.length, 1, "image creates one paid cash flow expense");
  assert.equal(supabase.cashFlowRows[0].source_ref_id, "line:image-message-1");
  assert.equal(supabase.cashFlowRows[0].category, "seasoning_cost", "cash flow stores the canonical category code");
  assert.equal(supabase.cashFlowRows[0].document_type, "receipt");
  assert.equal(supabase.cashFlowRows[0].has_attachment, true);
  assert.match(supabase.insertedRows[0].image_storage_path, /image-message-1\.jpg$/);
  assert.equal(supabase.uploadedFiles.length, 1, "image is uploaded to storage");
  assert.equal(fetchFn.calls.length, 2, "content and reply APIs are called");
  assert.match(fetchFn.calls[1].init.body, /บันทึกเข้า Cash Flow แล้ว/);
  assert.match(fetchFn.calls[1].init.body, /สถานะ จ่ายแล้ว/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const belowAutoSaveThreshold = async () => ({
    merchant: "ร้านที่ต้องตรวจ",
    transactionDate: "2026-07-22",
    amount: 999,
    paymentMethod: "โอนเงิน",
    category: "misc_expense",
    confidence: 0.85,
  });
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-pending",
          timestamp: 1784678400000,
          source: { userId: "line-user-pending" },
          message: { id: "image-message-pending", type: "image" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeReceipt: belowAutoSaveThreshold, logger: console },
  );

  assert.equal(result.ok, true, "uncertain receipt is accepted for review");
  assert.equal(supabase.cashFlowRows.length, 0, "85% confidence does not create a paid expense");
  assert.equal(supabase.insertedRows[0].processing_status, "pending_review");
  assert.match(fetchFn.calls[1].init.body, /ยังไม่บันทึกเป็นรายการจ่าย/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const missingPaymentMethod = async () => ({
    merchant: "บริษัท เควีเอส เฟรชโปรดักส์ จำกัด",
    transactionDate: "2026-07-24",
    amount: 6300,
    paymentMethod: "ไม่ระบุ",
    category: "chicken_purchase",
    confidence: 0.95,
    documentType: "invoice_receipt",
  });
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-missing-payment",
          timestamp: 1784851200000,
          source: { userId: "line-user-missing-payment" },
          message: { id: "image-message-missing-payment", type: "image" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeReceipt: missingPaymentMethod, logger: console },
  );

  assert.equal(result.ok, true, "clear purchase document with no payment method is accepted");
  assert.equal(supabase.cashFlowRows.length, 1, "purchase document creates one paid Cash Flow expense");
  assert.equal(supabase.cashFlowRows[0].status, "paid", "receipt and tax invoice are recorded as already paid");
  assert.equal(supabase.cashFlowRows[0].payment_method, "ไม่ระบุ", "payment method is not guessed");
  assert.equal(supabase.insertedRows[0].processing_status, "processed");
  assert.equal(supabase.insertedRows[0].cash_flow_entry_id, "cash-flow-entry-1");
  assert.equal(supabase.insertedRows[0].processing_error, null);
  assert.match(fetchFn.calls[1].init.body, /บันทึกเข้า Cash Flow แล้ว/);
  assert.match(fetchFn.calls[1].init.body, /6,300\.00/);
  assert.match(fetchFn.calls[1].init.body, /สถานะ จ่ายแล้ว/);
  assert.doesNotMatch(fetchFn.calls[1].init.body, /ข้อมูลไม่ชัดเจน/);
}

{
  const supabase = createSupabaseMock({ insertError: { code: "23505" } });
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-image-retry",
          timestamp: 1784678400000,
          source: { userId: "line-user-image-retry" },
          message: { id: "image-message-retry", type: "image" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeReceipt: successfulAnalysis, logger: console },
  );

  assert.equal(result.ok, true, "retried image event reuses the existing receipt row");
  assert.equal(supabase.cashFlowRows.length, 1, "cash flow insert remains protected by its source reference");
  assert.equal(supabase.updatedRows.length, 1, "existing receipt metadata and cash flow link are refreshed");
  assert.equal(supabase.updatedRows[0].value, "image-message-retry");
  assert.equal(fetchFn.calls.length, 1, "retried image event does not send a duplicate LINE reply");
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const textExpenseAnalysis = async () => ({
    transactionDate: "2026-07-24",
    amount: 350,
    description: "ค่าน้ำแข็ง",
    paymentMethod: "ไม่ระบุ",
    category: "ice_cost",
  });
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-text-expense",
          timestamp: 1784907600000,
          source: { userId: "line-user-text-expense" },
          message: { id: "text-expense-1", type: "text", text: "จ่ายค่าน้ำแข็ง 350 บาท" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeTextExpense: textExpenseAnalysis, logger: console },
  );

  assert.equal(result.ok, true, "explicit text expense is recorded");
  assert.equal(supabase.cashFlowRows.length, 1);
  assert.equal(supabase.cashFlowRows[0].status, "paid");
  assert.equal(supabase.cashFlowRows[0].category, "ice_cost");
  assert.equal(supabase.cashFlowRows[0].amount, 350);
  assert.equal(supabase.cashFlowRows[0].document_type, "no_document");
  assert.equal(supabase.cashFlowRows[0].has_attachment, false);
  assert.equal(supabase.insertedRows[0].processing_status, "processed");
  assert.equal(supabase.insertedRows[0].cash_flow_entry_id, "cash-flow-entry-1");
  assert.match(fetchFn.calls[0].init.body, /บันทึกเข้า Cash Flow แล้ว/);
  assert.match(fetchFn.calls[0].init.body, /350\.00/);
  assert.match(fetchFn.calls[0].init.body, /สถานะ จ่ายแล้ว/);
}

{
  const cases = [
    {
      text: "จ่ายค่าไก่สด 4,020 บาท",
      incorrectCategory: "rent_payment",
      expectedCategory: "chicken_purchase",
      expectedLabel: "ซื้อไก่สด",
    },
    {
      text: "จ่ายค่าขนส่งไก่สด 440 บาท",
      incorrectCategory: "chicken_purchase",
      expectedCategory: "transport",
      expectedLabel: "ค่าขนส่ง",
    },
    {
      text: "จ่ายค่าแรงแพ็คไก่ 2,500 บาท",
      incorrectCategory: "chicken_purchase",
      expectedCategory: "labor_cost",
      expectedLabel: "ค่าแรง",
    },
    {
      text: "จ่ายค่าข้าวเหนียว 1,200 บาท",
      incorrectCategory: "rent_payment",
      expectedCategory: "ingredient_purchase",
      expectedLabel: "ซื้อวัตถุดิบ\\/ข้าวเหนียว",
    },
    {
      text: "จ่ายค่าเครื่องปรุง 900 บาท",
      incorrectCategory: "misc_expense",
      expectedCategory: "seasoning_cost",
      expectedLabel: "ค่าเครื่องปรุง",
    },
  ];

  for (const [index, testCase] of cases.entries()) {
    const supabase = createSupabaseMock();
    const fetchFn = createFetchMock();
    const result = await processLineWebhookPayload(
      {
        events: [
          {
            type: "message",
            replyToken: `reply-token-expense-category-${index}`,
            timestamp: 1785257200000,
            source: { userId: "line-user-expense-category" },
            message: { id: `text-expense-category-${index}`, type: "text", text: testCase.text },
          },
        ],
      },
      {
        supabase,
        channelAccessToken: "channel-token",
        fetchFn,
        analyzeTextExpense: async () => ({
          transactionDate: "2026-07-28",
          amount: Number(testCase.text.match(/[\d,]+/)?.[0].replace(/,/g, "")),
          description: testCase.text.replace(/^\s*จ่าย/u, ""),
          paymentMethod: "ไม่ระบุ",
          category: testCase.incorrectCategory,
        }),
        logger: console,
      },
    );

    assert.equal(result.ok, true, `${testCase.text} is recorded`);
    assert.equal(
      supabase.cashFlowRows[0].category,
      testCase.expectedCategory,
      `${testCase.text} uses the business-purpose category instead of an incorrect model category`,
    );
    assert.match(
      fetchFn.calls[0].init.body,
      new RegExp(testCase.expectedLabel),
      `${testCase.text} replies with the canonical Cash Flow category label`,
    );
  }
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const textIncomeAnalysis = async () => ({
    transactionDate: "2026-07-24",
    amount: 3400,
    description: "ขายไก่หมักให้ Vinaibabee Kaokaew",
    paymentMethod: "ไม่ระบุ",
    category: "marinated_chicken_sales",
  });
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-text-income",
          timestamp: 1784907600000,
          source: { userId: "line-user-text-income" },
          message: {
            id: "text-income-1",
            type: "text",
            text: "ขายไก่หมัก\n@Vinaibabee Kaokaew 68*50=3,400บาท",
          },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, analyzeTextIncome: textIncomeAnalysis, logger: console },
  );

  assert.equal(result.ok, true, "sales text is recorded as received income");
  assert.equal(supabase.cashFlowRows.length, 1);
  assert.equal(supabase.cashFlowRows[0].type, "income");
  assert.equal(supabase.cashFlowRows[0].status, "received");
  assert.equal(supabase.cashFlowRows[0].category, "marinated_chicken_sales");
  assert.equal(supabase.cashFlowRows[0].amount, 3400);
  assert.equal(supabase.cashFlowRows[0].payment_method, "ไม่ระบุ");
  assert.equal(supabase.cashFlowRows[0].document_type, "no_document");
  assert.equal(supabase.insertedRows[0].processing_status, "processed");
  assert.match(fetchFn.calls[0].init.body, /บันทึกรายรับเข้า Cash Flow แล้ว/);
  assert.match(fetchFn.calls[0].init.body, /3,400\.00/);
  assert.match(fetchFn.calls[0].init.body, /สถานะ รับแล้ว/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-franchise-delivery-income",
          timestamp: 1785121200000,
          source: { userId: "line-user-franchise-delivery" },
          message: {
            id: "text-franchise-delivery-income-1",
            type: "text",
            text: [
              "รอบจัดส่ง 27 ก ค.69",
              "",
              "ดั้งเดิม 30 กก.",
              "พริก 20 กก.",
              "ตับ 10 กก.",
              "หนัง 10 กก.",
              "คุณแก๊ป",
              "ตลาดสะพานดำ นครสวรรค์",
              "โทร 061-4912753",
              "*ทางร้านจัดส่งเอง",
              "",
              "@Gaplaxy 65*70=4,550บาท",
            ].join("\n"),
          },
        },
      ],
    },
    {
      supabase,
      channelAccessToken: "channel-token",
      fetchFn,
      analyzeTextIncome: async () => {
        throw new Error("structured delivery orders must not call the OpenAI API");
      },
      logger: console,
    },
  );

  assert.equal(result.ok, true, "structured franchise delivery is recorded as income");
  assert.equal(supabase.cashFlowRows.length, 1);
  assert.equal(supabase.cashFlowRows[0].transaction_date, "2026-07-27");
  assert.equal(supabase.cashFlowRows[0].type, "income");
  assert.equal(supabase.cashFlowRows[0].status, "received");
  assert.equal(supabase.cashFlowRows[0].category, "marinated_chicken_sales");
  assert.equal(supabase.cashFlowRows[0].amount, 4550);
  assert.equal(
    supabase.cashFlowRows[0].description,
    "ขายไก่หมักให้คุณแก๊ป 70 กก. × 65 บาท/กก.",
  );
  assert.match(fetchFn.calls[0].init.body, /ลูกค้า คุณแก๊ป/);
  assert.match(fetchFn.calls[0].init.body, /ปริมาณ 70 กก\./);
  assert.match(fetchFn.calls[0].init.body, /ราคา 65 บาท\/กก\./);
  assert.match(fetchFn.calls[0].init.body, /ยอดรวม 4,550\.00 บาท/);
  assert.match(fetchFn.calls[0].init.body, /หมวด ขายไก่หมัก/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const dependencies = {
    supabase,
    channelAccessToken: "channel-token",
    fetchFn,
    analyzeTextIncome: async () => {
      throw new Error("split structured orders must not call the OpenAI API");
    },
    logger: console,
  };
  const orderText = [
    "ไก่ดั้งเดิม  55",
    "",
    "ไก่พริก  35",
    "",
    "คุณ จินตณี ซิ้วเฉี้ยง ร้านข้าวเหนียว ไก่ทอดตักเอง",
    "0642933608,0612621388",
    "",
    "หน้าร้านล้างรถหยอดเหรียญ MT Car Wash ถนนนวลแก้ว",
    "84 ถนนนวลแก้วอุทิศ ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา 90110",
    "",
    "**ขนส่ง ม่วงทองสุราษฎร์ 221 เท่านั้น",
  ].join("\n");

  const orderResult = await processLineWebhookPayload(
    {
      events: [{
        type: "message",
        replyToken: "reply-token-split-order",
        timestamp: Date.parse("2026-07-28T02:16:00.000Z"),
        source: { userId: "line-user-split-order" },
        message: { id: "split-order-details-1", type: "text", text: orderText },
      }],
    },
    dependencies,
  );

  assert.equal(orderResult.ok, true);
  assert.equal(supabase.cashFlowRows.length, 0, "order details alone wait for the calculation");
  assert.equal(supabase.insertedRows[0].processing_status, "message_received");
  assert.equal(supabase.insertedRows[0].extracted_data.kind, "marinated_chicken_order");
  assert.match(fetchFn.calls[0].init.body, /รับรายละเอียดออเดอร์ไก่หมักแล้ว/);
  assert.match(fetchFn.calls[0].init.body, /น้ำหนักรวม 90 กก\./);

  const equationResult = await processLineWebhookPayload(
    {
      events: [{
        type: "message",
        replyToken: "reply-token-split-equation",
        timestamp: Date.parse("2026-07-28T02:17:00.000Z"),
        source: { userId: "line-user-split-order" },
        message: { id: "split-order-equation-1", type: "text", text: "90*65=5,850บาท" },
      }],
    },
    dependencies,
  );

  assert.equal(equationResult.ok, true);
  assert.equal(supabase.cashFlowRows.length, 1, "the next calculation completes the pending order");
  assert.equal(supabase.cashFlowRows[0].transaction_date, "2026-07-28");
  assert.equal(supabase.cashFlowRows[0].type, "income");
  assert.equal(supabase.cashFlowRows[0].status, "received");
  assert.equal(supabase.cashFlowRows[0].category, "marinated_chicken_sales");
  assert.equal(supabase.cashFlowRows[0].amount, 5850);
  assert.equal(supabase.cashFlowRows[0].source_ref_id, "line:split-order-details-1");
  assert.equal(
    supabase.cashFlowRows[0].description,
    "ขายไก่หมักให้คุณ จินตณี ซิ้วเฉี้ยง 90 กก. × 65 บาท/กก.",
  );
  assert.equal(supabase.insertedRows[0].processing_status, "processed");
  assert.equal(supabase.insertedRows[1].processing_status, "processed");
  assert.match(fetchFn.calls[1].init.body, /ลูกค้า คุณ จินตณี ซิ้วเฉี้ยง/);
  assert.match(fetchFn.calls[1].init.body, /ปริมาณ 90 กก\./);
  assert.match(fetchFn.calls[1].init.body, /ราคา 65 บาท\/กก\./);
  assert.match(fetchFn.calls[1].init.body, /ยอดรวม 5,850\.00 บาท/);
  assert.match(fetchFn.calls[1].init.body, /หมวด ขายไก่หมัก/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [{
        type: "message",
        replyToken: "reply-token-orphan-equation",
        timestamp: Date.parse("2026-07-28T02:17:00.000Z"),
        source: { userId: "line-user-without-order" },
        message: { id: "orphan-order-equation-1", type: "text", text: "90*65=5,850บาท" },
      }],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, logger: console },
  );

  assert.equal(result.ok, true);
  assert.equal(supabase.cashFlowRows.length, 0, "an equation cannot attach to another user's order");
  assert.match(fetchFn.calls[0].init.body, /ไม่พบรายละเอียดออเดอร์ก่อนหน้า/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-invalid-franchise-delivery",
          timestamp: 1785121200000,
          source: { userId: "line-user-invalid-franchise-delivery" },
          message: {
            id: "text-invalid-franchise-delivery-1",
            type: "text",
            text: [
              "รอบจัดส่ง 27 ก.ค. 69",
              "ดั้งเดิม 30 กก.",
              "พริก 20 กก.",
              "คุณแก๊ป",
              "@Gaplaxy 65*70=4,550บาท",
            ].join("\n"),
          },
        },
      ],
    },
    {
      supabase,
      channelAccessToken: "channel-token",
      fetchFn,
      analyzeTextIncome: async () => {
        throw new Error("invalid structured orders must not call the OpenAI API");
      },
      logger: console,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(supabase.cashFlowRows.length, 0, "mismatched item weights are not recorded");
  assert.match(fetchFn.calls[0].init.body, /ยังไม่บันทึกรายรับ/);
  assert.match(fetchFn.calls[0].init.body, /ยอดกิโลกรัมรายการย่อยไม่ตรง/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const incorrectlyAnalyzedAsCourse = async () => ({
    transactionDate: "2026-07-25",
    amount: 2700,
    description: "ขายข้าวเหนียวไก่ทอดหน้าร้าน 135 ห่อ",
    paymentMethod: "ไม่ระบุ",
    category: "course_sales",
  });
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-storefront-income",
          timestamp: 1784990340000,
          source: { userId: "line-user-storefront-income" },
          message: {
            id: "text-income-storefront-1",
            type: "text",
            text: "ขายข้าวเหนียวไก่ทอดหน้าร้าน 135 ห่อห่อละ 20 บาท เป็นเงิน 2,700 บาท order โรงเรียนกีฬานครปฐม",
          },
        },
      ],
    },
    {
      supabase,
      channelAccessToken: "channel-token",
      fetchFn,
      analyzeTextIncome: incorrectlyAnalyzedAsCourse,
      logger: console,
    },
  );

  assert.equal(result.ok, true, "storefront sticky-rice fried-chicken sale is recorded");
  assert.equal(supabase.cashFlowRows.length, 1);
  assert.equal(
    supabase.cashFlowRows[0].category,
    "sales_revenue",
    "deterministic storefront rule overrides an incorrect AI course category",
  );
  assert.match(fetchFn.calls[0].init.body, /หมวด ยอดขายหน้าร้าน/);
}

{
  const supabase = createSupabaseMock();
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-2",
          timestamp: 1784678400000,
          source: { userId: "line-user-2" },
          message: { id: "text-message-1", type: "text" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, logger: console },
  );

  assert.equal(result.ok, true, "text event succeeds");
  assert.equal(supabase.insertedRows[0].processing_status, "message_received");
  assert.equal(supabase.insertedRows[0].image_storage_path, null);
  assert.equal(fetchFn.calls.length, 1, "only reply API is called for text");
  assert.match(fetchFn.calls[0].init.body, /หรือส่งรูปบิล/);
}

{
  const supabase = createSupabaseMock({ insertError: { code: "23505" } });
  const fetchFn = createFetchMock();
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-3",
          source: { userId: "line-user-3" },
          message: { id: "text-message-duplicate", type: "text" },
        },
      ],
    },
    { supabase, channelAccessToken: "channel-token", fetchFn, logger: console },
  );

  assert.equal(result.ok, true, "duplicate event does not fail webhook");
  assert.equal(fetchFn.calls.length, 0, "duplicate event does not send duplicate reply");
}

{
  const supabase = createSupabaseMock({ uploadError: { message: "storage unavailable" } });
  const fetchFn = createFetchMock();
  const errors = [];
  const result = await processLineWebhookPayload(
    {
      events: [
        {
          type: "message",
          replyToken: "reply-token-4",
          source: { userId: "line-user-4" },
          message: { id: "image-message-error", type: "image" },
        },
      ],
    },
    {
      supabase,
      channelAccessToken: "channel-token",
      fetchFn,
      logger: { ...console, error: (...args) => errors.push(args) },
    },
  );

  assert.equal(result.ok, false, "processing errors fail safely");
  assert.equal(result.code, "processing_error");
  assert.equal(errors.length, 1, "processing error is logged");
  assert.equal(JSON.stringify(errors).includes("channel-token"), false, "token is not leaked in logs");
}

console.log("LINE webhook tests passed");
