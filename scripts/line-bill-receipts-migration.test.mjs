import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/202607220001_line_bill_receipts.sql", "utf8");
const normalized = sql.replace(/\s+/g, " ").toLowerCase();

assert.match(sql, /create or replace function public\.current_profile_role\(\)/i, "migration must repair the role helper used by existing policies");
assert.match(sql, /from public\.profiles where id = auth\.uid\(\)/i, "owner role must come from the real profiles table");
assert.match(sql, /returns public\.user_role/i, "role helper must use the existing user_role enum");
assert.match(sql, /drop policy if exists "owners read line bill receipts"/i, "owner policy must tolerate partial previous runs");
assert.match(sql, /drop policy if exists "service role manages line bill receipts"/i, "service-role table policy must tolerate partial previous runs");
assert.match(sql, /drop policy if exists "service role manages line bill receipt images"/i, "service-role storage policy must tolerate partial previous runs");
assert.match(sql, /for all to service_role[\s\S]*auth\.role\(\) = 'service_role'/i, "service_role must be able to manage receipt rows");
assert.match(sql, /on storage\.objects[\s\S]*for all to service_role[\s\S]*bucket_id = 'line-bill-receipts'/i, "service_role must be able to manage receipt files in the bucket");
assert.match(sql, /for select to authenticated[\s\S]*public\.current_profile_role\(\) = 'owner'::public\.user_role/i, "owners must read receipts through the existing profile role system");
assert.match(sql, /create table if not exists public\.line_bill_receipts/i, "table creation must be idempotent");
assert.match(sql, /add column if not exists message_id/i, "partial table creation must be repaired");
assert.match(sql, /create index if not exists line_bill_receipts_event_at_idx/i, "index creation must be idempotent");
assert.match(sql, /on conflict \(id\) do update set public = excluded\.public/i, "bucket creation must be idempotent and private");
assert.match(sql, /alter table public\.line_bill_receipts enable row level security/i, "RLS must stay enabled");
assert.doesNotMatch(normalized, /disable row level security/, "migration must not disable RLS");
assert.doesNotMatch(normalized, /using \(true\)/, "migration must not use unrestricted USING policies");
assert.doesNotMatch(normalized, /with check \(true\)/, "migration must not use unrestricted WITH CHECK policies");
assert.doesNotMatch(normalized, /processing_status text not null default 'received'/, "default status must satisfy the check constraint");

console.log("LINE bill receipts migration policy tests passed");
