import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const baseSql = readFileSync("supabase/migrations/202607220001_line_bill_receipts.sql", "utf8");
const ocrSql = readFileSync("supabase/migrations/202607240001_line_bill_ocr_cash_flow.sql", "utf8");
const normalized = baseSql.replace(/\s+/g, " ").toLowerCase();

assert.match(baseSql, /create or replace function public\.current_profile_role\(\)/i, "migration must repair the role helper used by existing policies");
assert.match(baseSql, /from public\.profiles where id = auth\.uid\(\)/i, "owner role must come from the real profiles table");
assert.match(baseSql, /returns public\.user_role/i, "role helper must use the existing user_role enum");
assert.match(baseSql, /drop policy if exists "owners read line bill receipts"/i, "owner policy must tolerate partial previous runs");
assert.match(baseSql, /drop policy if exists "service role manages line bill receipts"/i, "service-role table policy must tolerate partial previous runs");
assert.match(baseSql, /drop policy if exists "service role manages line bill receipt images"/i, "service-role storage policy must tolerate partial previous runs");
assert.match(baseSql, /for all to service_role[\s\S]*auth\.role\(\) = 'service_role'/i, "service_role must be able to manage receipt rows");
assert.match(baseSql, /on storage\.objects[\s\S]*for all to service_role[\s\S]*bucket_id = 'line-bill-receipts'/i, "service_role must be able to manage receipt files in the bucket");
assert.match(baseSql, /for select to authenticated[\s\S]*public\.current_profile_role\(\) = 'owner'::public\.user_role/i, "owners must read receipts through the existing profile role system");
assert.match(baseSql, /create table if not exists public\.line_bill_receipts/i, "table creation must be idempotent");
assert.match(baseSql, /add column if not exists message_id/i, "partial table creation must be repaired");
assert.match(baseSql, /create index if not exists line_bill_receipts_event_at_idx/i, "index creation must be idempotent");
assert.match(baseSql, /on conflict \(id\) do update set public = excluded\.public/i, "bucket creation must be idempotent and private");
assert.match(baseSql, /alter table public\.line_bill_receipts enable row level security/i, "RLS must stay enabled");
assert.doesNotMatch(normalized, /disable row level security/, "migration must not disable RLS");
assert.doesNotMatch(normalized, /using \(true\)/, "migration must not use unrestricted USING policies");
assert.doesNotMatch(normalized, /with check \(true\)/, "migration must not use unrestricted WITH CHECK policies");
assert.doesNotMatch(normalized, /processing_status text not null default 'received'/, "default status must satisfy the check constraint");
assert.match(ocrSql, /add column if not exists extracted_data jsonb/i, "OCR migration must retain extracted receipt data");
assert.match(ocrSql, /add column if not exists confidence numeric\(5,4\)/i, "OCR migration must retain confidence for audit");
assert.match(ocrSql, /add column if not exists cash_flow_entry_id uuid/i, "OCR migration must link receipts to Cash Flow");
assert.match(ocrSql, /'pending_review'[\s\S]*'processed'/i, "OCR migration must support review and processed states");
assert.match(
  ocrSql,
  /create unique index if not exists cash_flow_entries_line_source_ref_id_unique[\s\S]*where source_ref_id like 'line:%'/i,
  "OCR migration must enforce database-level duplicate protection for LINE receipts",
);

console.log("LINE bill receipts migration policy tests passed");
