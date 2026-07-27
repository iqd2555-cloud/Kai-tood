import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapGoogleFormStandardLead,
  type GoogleFormStandardLeadInput,
} from "@/lib/google-form-standard-lead";

export type GoogleFormSyncResult =
  | { outcome: "created"; leadId: string }
  | { outcome: "merged"; leadId: string }
  | { outcome: "duplicate"; leadId: string | null };

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

export async function syncGoogleFormStandardLead(
  supabase: SupabaseClient,
  input: GoogleFormStandardLeadInput,
): Promise<GoogleFormSyncResult> {
  const mapped = mapGoogleFormStandardLead(input);
  const importRow = {
    external_id: mapped.externalId,
    spreadsheet_id: mapped.spreadsheetId,
    sheet_name: mapped.sheetName,
    row_number: mapped.rowNumber,
    submitted_at: mapped.submittedAt,
    payload_hash: mapped.payloadHash,
    phone_normalized: mapped.phoneNormalized || null,
    raw_payload: mapped.lead.source_payload,
    status: "processing",
    last_error: null,
  };

  const { data: existingImport, error: existingImportError } = await supabase
    .from("google_form_franchise_imports")
    .select("id, status, lead_id")
    .eq("external_id", mapped.externalId)
    .maybeSingle();
  if (existingImportError) throw existingImportError;
  if (existingImport?.status === "complete" || existingImport?.status === "processing") {
    return { outcome: "duplicate", leadId: existingImport.lead_id ?? null };
  }

  let importId = existingImport?.id as string | undefined;
  if (importId) {
    const { error } = await supabase
      .from("google_form_franchise_imports")
      .update(importRow)
      .eq("id", importId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("google_form_franchise_imports")
      .insert(importRow)
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: racedImport } = await supabase
        .from("google_form_franchise_imports")
        .select("lead_id")
        .eq("external_id", mapped.externalId)
        .maybeSingle();
      return { outcome: "duplicate", leadId: racedImport?.lead_id ?? null };
    }
    if (error) throw error;
    importId = data.id as string;
  }

  try {
    let existingLead: { id: string; line_id: string | null; source_submitted_at: string | null; source_payload: unknown } | null = null;
    if (mapped.phoneNormalized) {
      const { data, error } = await supabase
        .from("franchise_leads")
        .select("id, line_id, source_submitted_at, source_payload")
        .eq("phone_normalized", mapped.phoneNormalized)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      existingLead = data;
    }

    let leadId: string;
    let outcome: "created" | "merged";
    if (existingLead) {
      leadId = existingLead.id;
      outcome = "merged";
      const patch: Record<string, unknown> = {};
      if (!existingLead.line_id && mapped.lead.line_id) patch.line_id = mapped.lead.line_id;
      if (!existingLead.source_submitted_at && mapped.submittedAt) patch.source_submitted_at = mapped.submittedAt;
      if (!existingLead.source_payload) patch.source_payload = mapped.lead.source_payload;
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("franchise_leads").update(patch).eq("id", leadId);
        if (error) throw error;
      }
    } else {
      const { data, error } = await supabase
        .from("franchise_leads")
        .insert(mapped.lead)
        .select("id")
        .single();
      if (error) throw error;
      leadId = data.id as string;
      outcome = "created";
    }

    const { error: completeError } = await supabase
      .from("google_form_franchise_imports")
      .update({ status: "complete", lead_id: leadId, last_error: null })
      .eq("id", importId);
    if (completeError) throw completeError;

    return { outcome, leadId };
  } catch (error) {
    await supabase
      .from("google_form_franchise_imports")
      .update({ status: "failed", last_error: errorMessage(error) })
      .eq("id", importId);
    throw error;
  }
}
