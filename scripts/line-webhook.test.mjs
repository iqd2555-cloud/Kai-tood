import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  handleLineWebhookRequest,
  processLineWebhookPayload,
  verifyLineSignature,
} from "../lib/line-webhook.ts";
import { createSupabaseAdminClient, getSupabaseAdminClientDiagnostics } from "../lib/supabase-admin.ts";

function sign(body, secret) {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function createSupabaseMock({ insertError = null, uploadError = null } = {}) {
  const insertedRows = [];
  const cashFlowRows = [];
  const uploadedFiles = [];

  return {
    insertedRows,
    cashFlowRows,
    uploadedFiles,
    from(table) {
      return {
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
  category: "เครื่องปรุง",
  confidence: 0.95,
});

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
  assert.match(supabase.insertedRows[0].image_storage_path, /image-message-1\.jpg$/);
  assert.equal(supabase.uploadedFiles.length, 1, "image is uploaded to storage");
  assert.equal(fetchFn.calls.length, 2, "content and reply APIs are called");
  assert.match(fetchFn.calls[1].init.body, /บันทึกค่าใช้จ่ายแล้ว/);
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
  assert.match(fetchFn.calls[0].init.body, /กรุณาส่งรูปบิล/);
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
