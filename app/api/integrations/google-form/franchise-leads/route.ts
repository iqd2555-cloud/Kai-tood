import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { syncGoogleFormStandardLead } from "@/lib/google-form-franchise-sync";
import type { GoogleFormStandardLeadInput } from "@/lib/google-form-standard-lead";

export const runtime = "nodejs";
export const maxDuration = 60;

function hashesMatch(provided: string, expectedHash: string) {
  const providedHash = createHash("sha256").update(provided).digest("hex");
  const providedBuffer = Buffer.from(providedHash);
  const expectedBuffer = Buffer.from(expectedHash);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

function isInput(value: unknown): value is GoogleFormStandardLeadInput {
  return typeof value === "object"
    && value !== null
    && ("namedValues" in value || "externalId" in value);
}

export async function POST(request: Request) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase admin is not configured" }, { status: 503 });
  }

  const { data: syncConfig, error: syncConfigError } = await supabase
    .from("google_form_franchise_sync_config")
    .select("secret_hash")
    .eq("singleton", true)
    .maybeSingle();
  if (syncConfigError || !syncConfig?.secret_hash) {
    console.error("Google Form sync config is unavailable", syncConfigError);
    return NextResponse.json({ ok: false, message: "Google Form sync is not configured" }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-google-form-sync-secret")?.trim() ?? "";
  if (!providedSecret || !hashesMatch(providedSecret, syncConfig.secret_hash)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const candidateRows = typeof body === "object"
    && body !== null
    && "rows" in body
    && Array.isArray((body as { rows?: unknown }).rows)
    ? (body as { rows: unknown[] }).rows
    : [body];
  if (candidateRows.length === 0 || candidateRows.length > 200 || !candidateRows.every(isInput)) {
    return NextResponse.json({ ok: false, message: "Invalid row payload" }, { status: 400 });
  }

  const summary = { created: 0, merged: 0, duplicate: 0, failed: 0 };
  for (const row of candidateRows) {
    try {
      const result = await syncGoogleFormStandardLead(supabase, row);
      summary[result.outcome] += 1;
    } catch (error) {
      summary.failed += 1;
      console.error("Google Form franchise lead sync failed", error);
    }
  }

  return NextResponse.json({
    ok: summary.failed === 0,
    processed: candidateRows.length,
    ...summary,
  }, { status: summary.failed === 0 ? 200 : 207 });
}
