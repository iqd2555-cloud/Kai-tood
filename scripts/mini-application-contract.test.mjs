import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import thaiAddressData from "../data/thai-address.json" with { type: "json" };

const thaiProvinces = Object.keys(thaiAddressData);
const getThaiDistricts = (province) => Object.keys(thaiAddressData[province] ?? {});
const getThaiSubdistricts = (province, district) => thaiAddressData[province]?.[district] ?? [];

const applyAction = readFileSync("app/apply-mini/actions.ts", "utf8");
const applyForm = readFileSync("app/apply-mini/mini-apply-form.tsx", "utf8");
const ownerPage = readFileSync("app/(app)/mini-applications/page.tsx", "utf8");
const contactActions = readFileSync("app/(app)/mini-applications/mini-contact-actions.tsx", "utf8");
const qualification = readFileSync("lib/mini-application-qualification.ts", "utf8");
const migration = readFileSync("supabase/migrations/202607240003_mini_franchise_applications_production_contract.sql", "utf8");
const budgetMigration = readFileSync("supabase/migrations/202607270001_mini_investment_budget_readiness.sql", "utf8");

assert.match(applyAction, /from\("mini_franchise_applications"\)\.insert/, "MINI form must insert into mini_franchise_applications");
assert.match(applyAction, /referenceCode/, "MINI form must return a reference code after insert/idempotent replay");
assert.match(applyAction, /investment_budget_range/, "MINI action must persist the total investment budget");
assert.match(applyForm, /งบลงทุนรวมที่พร้อมใช้สำหรับสมัคร MINI STARTER/, "MINI form must ask for total available investment");
assert.match(ownerPage, /from\("mini_franchise_applications"\)\.select/, "Owner MINI page must read from mini_franchise_applications");
assert.match(ownerPage, /qualifyMiniApplication/, "Owner MINI page must rank applications before contact");
assert.match(ownerPage, /MiniContactActions/, "Owner MINI page must expose efficient contact actions");
assert.doesNotMatch(ownerPage, /รายละเอียด: \{error\.message\}/, "Owner UI must not expose raw database errors");
assert.match(ownerPage, /opening_subdistrict/, "Owner MINI page must display and filter subdistrict");
assert.match(contactActions, /ไม่ต้องโทรกลับ/, "Group C applications must not expose a callback action");
assert.match(qualification, /investmentBudget\.belowMinimum/, "Budget below the MINI price must be a hard callback stop");
assert.match(migration, /create table if not exists public\.mini_franchise_applications/i, "Production repair migration must create canonical MINI table");
assert.match(migration, /enable row level security/i, "Production repair migration must keep RLS enabled");
assert.match(migration, /for insert\s+to anon, authenticated/i, "RLS must allow public application submission only through insert policy");
assert.match(migration, /profiles\.role = 'owner'/i, "Owner policy must use real profiles.role owner check");
assert.match(migration, /notify pgrst, 'reload schema'/i, "Migration must reload PostgREST schema cache");
assert.match(budgetMigration, /add column if not exists investment_budget_range text/i, "Budget migration must add total investment budget");
assert.match(budgetMigration, /ต่ำกว่า 9,900 บาท/, "Budget migration must preserve the hard-stop threshold");

assert.equal(thaiProvinces.includes("กรุงเทพมหานคร"), true, "Bangkok must be listed");
assert.equal(getThaiDistricts("นครสวรรค์").includes("เมืองนครสวรรค์"), true, "Nakhon Sawan city district must be listed");
assert.equal(getThaiSubdistricts("นครสวรรค์", "เมืองนครสวรรค์").includes("ปากน้ำโพ"), true, "Pak Nam Pho must be selectable");
assert.equal(getThaiDistricts("กรุงเทพมหานคร").includes("เขตจตุจักร"), true, "Chatuchak district must be listed");
assert.equal(getThaiSubdistricts("กรุงเทพมหานคร", "เขตจตุจักร").includes("ลาดยาว"), true, "Lat Yao subdistrict must be selectable");

console.log("MINI application contract tests passed");
