import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/202607280001_google_form_sync_v2.sql",
  "utf8",
);
const appsScript = readFileSync(
  "docs/google-form-standard-franchise-sync.gs",
  "utf8",
);
const route = readFileSync(
  "app/api/integrations/google-form/franchise-leads/route.ts",
  "utf8",
);

assert.match(migration, /add column if not exists email text/i);
assert.match(migration, /franchise_leads_google_form_phone_uidx/i);
assert.match(migration, /where source = 'google_form' and phone_normalized <> ''/i);
assert.match(appsScript, /syncStandardFranchiseSheetEdit/);
assert.match(appsScript, /reconcileStandardFranchiseResponses/);
assert.match(appsScript, /everyHours\(1\)/);
assert.match(appsScript, /INTERNAL_SYNC_ID_HEADER/);
assert.match(route, /updated: 0/);

console.log("Google Form sync migration and Apps Script contract tests passed");
