import { createHash } from "node:crypto";

export type GoogleFormNamedValues = Record<string, string | string[]>;

export type GoogleFormStandardLeadInput = {
  externalId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  rowNumber?: number;
  submittedAt?: string;
  namedValues?: GoogleFormNamedValues;
};

export type MappedGoogleFormStandardLead = {
  externalId: string;
  spreadsheetId: string | null;
  sheetName: string | null;
  rowNumber: number | null;
  submittedAt: string | null;
  payloadHash: string;
  phoneNormalized: string;
  lead: {
    full_name: string;
    phone: string;
    line_id: string | null;
    province: string;
    district: string;
    has_capital: string;
    budget_range: string;
    preferred_model: string;
    available_area: string;
    location_type: string;
    experience: string;
    note: string | null;
    status: "new";
    has_location: string;
    working_capital: string;
    available_time_per_day: string;
    business_experience: string;
    expected_daily_income: string;
    understanding_confirmed: boolean;
    internal_note: null;
    source: "google_form";
    source_submitted_at: string | null;
    source_payload: Record<string, string>;
    created_at?: string;
  };
};

const questions = {
  fullName: ["ชื่อ-นามสกุล", "ชื่อ นามสกุล", "ชื่อและนามสกุล"],
  contact: ["เบอร์โทรศัพท์ / LINE ID", "เบอร์โทรศัพท์/LINE ID", "เบอร์โทร", "โทรศัพท์", "LINE ID"],
  openingArea: ["จังหวัด / อำเภอ ที่ต้องการเปิดร้าน", "จังหวัด/อำเภอ ที่ต้องการเปิดร้าน", "จังหวัดและอำเภอที่ต้องการเปิดร้าน"],
  hasLocation: ["ตอนนี้มีทำเลแล้วหรือยัง", "มีทำเลแล้วหรือยัง"],
  locationType: ["ลักษณะทำเลที่ต้องการเปิดร้าน", "ประเภททำเล", "ลักษณะทำเล"],
  budget: ["งบลงทุนที่เตรียมไว้", "งบลงทุน", "งบประมาณ"],
  workingCapital: ["มีทุนสำรองสำหรับหมุนเวียนร้านหรือไม่", "ทุนสำรอง", "เงินทุนสำรอง"],
  availableTime: ["เจ้าของสามารถอยู่ร้านเองช่วงแรกได้กี่ชั่วโมงต่อวัน", "เวลาที่สามารถดูแลร้านได้ต่อวัน"],
  experience: ["เคยขายอาหารหรือขายของมาก่อนหรือไม่", "ประสบการณ์ขาย/ทำธุรกิจ", "ประสบการณ์"],
  expectedSales: ["เป้าหมายยอดขายต่อวัน", "รายได้ต่อวันที่คาดหวัง", "ยอดขายต่อวันที่คาดหวัง"],
  confirmation: ["ยืนยันความเข้าใจเบื้องต้น", "ยืนยันความเข้าใจ"],
} as const;

function normalizeHeader(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("th-TH");
}

function flattenNamedValues(namedValues: GoogleFormNamedValues | undefined) {
  const flattened: Record<string, string> = {};
  for (const [key, value] of Object.entries(namedValues ?? {})) {
    flattened[key.trim()] = (Array.isArray(value) ? value.join(", ") : value).trim();
  }
  return flattened;
}

function findAnswer(values: Record<string, string>, aliases: readonly string[]) {
  const normalizedEntries = Object.entries(values).map(([key, value]) => [normalizeHeader(key), value] as const);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const exact = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (exact) return exact[1].trim();
  }
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const partial = normalizedEntries.find(([key]) => key.includes(normalizedAlias) || normalizedAlias.includes(key));
    if (partial) return partial[1].trim();
  }
  return "";
}

function parseContact(rawContact: string) {
  const phoneMatch = rawContact.match(/(?:\+?66|0)[0-9\s-]{8,}/);
  const rawPhone = phoneMatch?.[0]?.trim() ?? "";
  const digits = rawPhone.replace(/\D/g, "");
  const phone = digits.startsWith("66") ? `0${digits.slice(2)}` : digits;
  const remaining = phoneMatch
    ? rawContact.replace(phoneMatch[0], "").replace(/^[\s,;/|:-]+|[\s,;/|:-]+$/g, "").trim()
    : rawContact.trim();
  const lineId = remaining && remaining !== rawPhone ? remaining : "";
  return {
    phone: phone || "ไม่ระบุเบอร์โทร",
    phoneNormalized: phone,
    lineId: lineId || null,
  };
}

function cleanAreaPart(value: string) {
  return value
    .replace(/^(?:จังหวัด|จ\.|อำเภอ|อ\.|เขต)\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOpeningArea(rawArea: string) {
  const normalized = rawArea.replace(/\s+/g, " ").trim();
  const labeled = normalized.match(/(?:จังหวัด|จ\.)?\s*([^,/]+?)\s*(?:\/|,|\s+(?:อำเภอ|อ\.|เขต)\s*)\s*(.+)$/u);
  if (labeled) {
    return {
      province: cleanAreaPart(labeled[1]) || "ไม่ระบุจังหวัด",
      district: cleanAreaPart(labeled[2]) || "ไม่ระบุอำเภอ",
    };
  }

  const parts = normalized.split(/\s*(?:\/|,|\n|\|)\s*/u).map(cleanAreaPart).filter(Boolean);
  if (parts.length >= 2) return { province: parts[0], district: parts.slice(1).join(" / ") };

  const words = normalized.split(/\s+/u).filter(Boolean);
  if (words.length >= 2) return { province: cleanAreaPart(words[0]), district: cleanAreaPart(words.slice(1).join(" ")) };

  return {
    province: cleanAreaPart(normalized) || "ไม่ระบุจังหวัด",
    district: "ไม่ระบุอำเภอ",
  };
}

function parseSubmittedAt(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function mapGoogleFormStandardLead(input: GoogleFormStandardLeadInput): MappedGoogleFormStandardLead {
  const namedValues = flattenNamedValues(input.namedValues);
  const contact = parseContact(findAnswer(namedValues, questions.contact));
  const openingArea = parseOpeningArea(findAnswer(namedValues, questions.openingArea));
  const submittedAt = parseSubmittedAt(input.submittedAt);
  const payloadHash = stableHash(namedValues);
  const externalId = input.externalId?.trim()
    || stableHash({
      spreadsheetId: input.spreadsheetId ?? "",
      sheetName: input.sheetName ?? "",
      rowNumber: input.rowNumber ?? null,
      submittedAt,
      payloadHash,
    });

  const hasLocation = findAnswer(namedValues, questions.hasLocation) || "ยังไม่ระบุ";
  const workingCapital = findAnswer(namedValues, questions.workingCapital) || "ยังไม่แน่ใจ";
  const businessExperience = findAnswer(namedValues, questions.experience) || "ไม่เคยขายมาก่อน";
  const confirmation = findAnswer(namedValues, questions.confirmation);

  const lead: MappedGoogleFormStandardLead["lead"] = {
    full_name: findAnswer(namedValues, questions.fullName) || "ไม่ระบุชื่อ",
    phone: contact.phone,
    line_id: contact.lineId,
    province: openingArea.province,
    district: openingArea.district,
    has_capital: workingCapital,
    budget_range: findAnswer(namedValues, questions.budget) || "ยังไม่แน่ใจ",
    preferred_model: "ชุดมาตรฐาน",
    available_area: hasLocation,
    location_type: findAnswer(namedValues, questions.locationType) || "ยังไม่แน่ใจ",
    experience: businessExperience,
    note: null,
    status: "new",
    has_location: hasLocation,
    working_capital: workingCapital,
    available_time_per_day: findAnswer(namedValues, questions.availableTime) || "ยังไม่แน่ใจ",
    business_experience: businessExperience,
    expected_daily_income: findAnswer(namedValues, questions.expectedSales) || "ยังไม่แน่ใจ",
    understanding_confirmed: confirmation.length > 0,
    internal_note: null,
    source: "google_form",
    source_submitted_at: submittedAt,
    source_payload: namedValues,
  };
  if (submittedAt) lead.created_at = submittedAt;

  return {
    externalId,
    spreadsheetId: input.spreadsheetId?.trim() || null,
    sheetName: input.sheetName?.trim() || null,
    rowNumber: Number.isInteger(input.rowNumber) ? input.rowNumber ?? null : null,
    submittedAt,
    payloadHash,
    phoneNormalized: contact.phoneNormalized,
    lead,
  };
}
