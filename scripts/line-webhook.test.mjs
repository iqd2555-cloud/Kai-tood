import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  processLineWebhookPayload,
  verifyLineSignature,
} from "../lib/line-webhook.ts";

function sign(body, secret) {
  return createHmac("sha256", secret).update(body).digest("base64");
}

function createSupabaseMock({ insertError = null, uploadError = null } = {}) {
  const insertedRows = [];
  const uploadedFiles = [];

  return {
    insertedRows,
    uploadedFiles,
    from(table) {
      assert.equal(table, "line_bill_receipts");
      return {
        insert(row) {
          insertedRows.push(row);
          return Promise.resolve({ error: insertError });
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
    { supabase, channelAccessToken: "channel-token", fetchFn, logger: console },
  );

  assert.equal(result.ok, true, "image event succeeds");
  assert.equal(supabase.insertedRows.length, 1, "image event is persisted");
  assert.equal(supabase.insertedRows[0].message_id, "image-message-1");
  assert.equal(supabase.insertedRows[0].message_type, "image");
  assert.equal(supabase.insertedRows[0].processing_status, "image_received");
  assert.match(supabase.insertedRows[0].image_storage_path, /image-message-1\.jpg$/);
  assert.equal(supabase.uploadedFiles.length, 1, "image is uploaded to storage");
  assert.equal(fetchFn.calls.length, 2, "content and reply APIs are called");
  assert.match(fetchFn.calls[1].init.body, /ได้รับรูปบิลแล้ว/);
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
