"use client";

import type { FranchiseLead, LeadStatus } from "@/lib/types";

const statusLabels: Record<LeadStatus, string> = {
  new: "ใหม่",
  contacted: "ติดต่อแล้ว",
  awaiting_info: "รอข้อมูลเพิ่มเติม",
  interested: "สนใจจริง",
  appointment_scheduled: "นัดคุยแล้ว",
  not_ready: "ไม่พร้อมลงทุน",
  not_qualified: "ไม่ผ่านการคัดกรอง",
  converted: "ปิดการขายแล้ว",
};

const headers = [
  "วันที่สมัคร",
  "ชื่อ-นามสกุล",
  "เบอร์โทร",
  "Line ID",
  "จังหวัด",
  "อำเภอ/เขต",
  "มีทำเล/พื้นที่",
  "ประเภททำเล",
  "งบประมาณ",
  "ทุนสำรอง",
  "รูปแบบที่สนใจ",
  "เวลาที่สะดวกให้ติดต่อ",
  "ประสบการณ์",
  "รายได้คาดหวัง",
  "ยืนยันความเข้าใจ",
  "สถานะการติดตาม",
  "บันทึกภายใน",
];

function displayValue(value: string | null | undefined) {
  return value?.trim() || "-";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportLeadsToCsv(leads: FranchiseLead[]) {
  const rows = leads.map((lead) => [
    formatDate(lead.created_at),
    displayValue(lead.full_name),
    displayValue(lead.phone),
    displayValue(lead.line_id),
    displayValue(lead.province),
    displayValue(lead.district),
    displayValue(lead.has_location || lead.available_area),
    displayValue(lead.location_type),
    displayValue(lead.budget_range),
    displayValue(lead.working_capital || lead.has_capital),
    displayValue(lead.preferred_model),
    displayValue(lead.available_time_per_day),
    displayValue(lead.business_experience || lead.experience),
    displayValue(lead.expected_daily_income),
    lead.understanding_confirmed ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน",
    statusLabels[lead.status] ?? lead.status,
    displayValue(lead.internal_note),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `franchise-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportLeadsButton({ leads }: { leads: FranchiseLead[] }) {
  return (
    <button
      type="button"
      onClick={() => exportLeadsToCsv(leads)}
      disabled={leads.length === 0}
      className="rounded-2xl bg-[#F6C400] px-5 py-3 font-black text-[#111111] shadow-sm transition hover:bg-[#FFD84D] disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/35"
    >
      ดาวน์โหลด CSV
    </button>
  );
}
