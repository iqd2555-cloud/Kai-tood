#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const targetDate = process.argv[3];
const branchSearch = process.argv[4];

if (!email || !targetDate || !branchSearch) {
  console.error("Usage: node scripts/audit-daily-report-visibility.mjs <email> <YYYY-MM-DD> <branch-name-fragment>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const day = new Date(`${targetDate}T00:00:00Z`);
const dates = [-1, 0, 1].map((offset) => {
  const value = new Date(day);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
});

async function must(label, query) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const profiles = await must("profiles", supabase.from("profiles").select("id,email,full_name,role,branch_id,branch_name").ilike("email", email));
const userIds = profiles.map((profile) => profile.id);
const reports = userIds.length === 0 ? [] : await must(
  "daily_reports by submitter/date",
  supabase
    .from("daily_reports")
    .select("id,submitted_by,branch_id,branch_name,report_date,created_at,updated_at,cash_sales,transfer_sales,total_sales,received_chicken,received_sticky_rice,used_bl,used_bb,used_chopped_chicken,used_drumstick,used_offal,used_chicken_skin,used_sticky_rice,remaining_chicken,remaining_sticky_rice,branches(id,name,code,is_active)")
    .in("submitted_by", userIds)
    .in("report_date", dates)
    .order("report_date", { ascending: true })
    .order("updated_at", { ascending: false }),
);
const branches = await must("branches", supabase.from("branches").select("id,name,code,is_active,created_at").ilike("name", `%${branchSearch}%`).order("name"));
const branchIds = branches.map((branch) => branch.id);
const branchDateReports = branchIds.length === 0 ? [] : await must(
  "daily_reports by branch/date",
  supabase
    .from("daily_reports")
    .select("id,submitted_by,branch_id,branch_name,report_date,created_at,updated_at,cash_sales,transfer_sales,total_sales,received_chicken,received_sticky_rice,used_bl,used_bb,used_chopped_chicken,used_drumstick,used_offal,used_chicken_skin,used_sticky_rice,remaining_chicken,remaining_sticky_rice,profiles:submitted_by(email,full_name,role,branch_id)")
    .in("branch_id", branchIds)
    .eq("report_date", targetDate)
    .order("updated_at", { ascending: false }),
);
const rollups = await must(
  "daily_report_rollups target date",
  supabase.from("daily_report_rollups").select("report_date,branch_id,branch_name,branch_code,total_sales,report_count").eq("report_date", targetDate).order("branch_name"),
);

console.log(JSON.stringify({ email, targetDate, branchSearch, checkedDates: dates, profiles, submittedReportsAroundDate: reports, matchingBranches: branches, matchingBranchReportsOnTargetDate: branchDateReports, targetDateRollups: rollups }, null, 2));
