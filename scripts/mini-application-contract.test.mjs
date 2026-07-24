import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getThaiDistricts, getThaiSubdistricts, thaiProvinces } from "../lib/thai-address.ts";

const applyAction = readFileSync("app/apply-mini/actions.ts", "utf8");
const ownerPage = readFileSync("app/(app)/mini-applications/page.tsx", "utf8");
const migration = readFileSync("supabase/migrations/202607240003_mini_franchise_applications_production_contract.sql", "utf8");

assert.match(applyAction, /from\("mini_franchise_applications"\)\.insert/, "MINI form must insert into mini_franchise_applications");
assert.match(applyAction, /select\("id, reference_code"\)/, "MINI form must return the database id and real reference code after insert/idempotent replay");
assert.match(ownerPage, /from\("mini_franchise_applications"\)\.select/, "Owner MINI page must read from mini_franchise_applications");
assert.doesNotMatch(ownerPage, /รายละเอียด: \{error\.message\}/, "Owner UI must not expose raw database errors");
assert.match(ownerPage, /opening_subdistrict/, "Owner MINI page must display and filter subdistrict");
assert.match(migration, /create table if not exists public\.mini_franchise_applications/i, "Production repair migration must create canonical MINI table");
assert.match(migration, /enable row level security/i, "Production repair migration must keep RLS enabled");
assert.match(migration, /for insert\s+to anon, authenticated/i, "RLS must allow public application submission only through insert policy");
assert.match(migration, /profiles\.role = 'owner'/i, "Owner policy must use real profiles.role owner check");
assert.match(migration, /notify pgrst, 'reload schema'/i, "Migration must reload PostgREST schema cache");

assert.equal(thaiProvinces.includes("กรุงเทพมหานคร"), true, "Bangkok must be listed");
assert.equal(getThaiDistricts("นครสวรรค์").includes("เมืองนครสวรรค์"), true, "Nakhon Sawan city district must be listed");
assert.equal(getThaiSubdistricts("นครสวรรค์", "เมืองนครสวรรค์").includes("ปากน้ำโพ"), true, "Pak Nam Pho must be selectable");
assert.equal(getThaiDistricts("กรุงเทพมหานคร").includes("เขตจตุจักร"), true, "Chatuchak district must be listed");
assert.equal(getThaiSubdistricts("กรุงเทพมหานคร", "เขตจตุจักร").includes("ลาดยาว"), true, "Lat Yao subdistrict must be selectable");

console.log("MINI application contract tests passed");
