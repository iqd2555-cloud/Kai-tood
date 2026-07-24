import type { FranchiseLead } from "@/lib/types";

export type FranchiseLeadQualification = {
  group: "A" | "B" | "C";
  score: number;
  label: string;
  reason: string;
  tone: string;
};

export function qualifyFranchiseLead(lead: FranchiseLead): FranchiseLeadQualification {
  if (lead.status === "not_qualified" || lead.status === "not_ready") {
    return {
      group: "C",
      score: 0,
      label: "กลุ่ม C — ยังไม่ควรโทร",
      reason: lead.status === "not_qualified" ? "ไม่ผ่านการคัดกรอง" : "ยังไม่พร้อมลงทุน",
      tone: "border-red-200 bg-red-50 text-red-800",
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const hasLocation = lead.has_location || lead.available_area || "";
  const workingCapital = lead.working_capital || lead.has_capital || "";

  if (hasLocation === "มีทำเลแล้ว") {
    score += 3;
    reasons.push("มีทำเลแล้ว");
  } else if (hasLocation.includes("กำลังเจรจา")) {
    score += 2;
    reasons.push("กำลังเจรจาทำเล");
  }

  if (["40,001–60,000 บาท", "มากกว่า 60,000 บาท"].includes(lead.budget_range)) {
    score += 3;
    reasons.push("งบเหมาะกับชุดมาตรฐาน");
  } else if (lead.budget_range === "20,001–40,000 บาท") {
    score += 2;
    reasons.push("มีงบระดับกลาง");
  } else if (lead.budget_range === "10,000–20,000 บาท") {
    score += 1;
  }

  if (workingCapital === "มีทุนสำรองมากกว่า 3 เดือน") {
    score += 2;
    reasons.push("มีทุนสำรองมากกว่า 3 เดือน");
  } else if (workingCapital === "มีทุนสำรอง 2–3 เดือน") {
    score += 2;
    reasons.push("มีทุนสำรอง 2–3 เดือน");
  } else if (workingCapital === "มีทุนสำรองประมาณ 1 เดือน") {
    score += 1;
  }

  if (["6–8 ชั่วโมงต่อวัน", "อยู่ได้เต็มวัน"].includes(lead.available_time_per_day)) {
    score += 1;
    reasons.push("มีเวลาดูแลร้าน");
  }
  if (lead.understanding_confirmed) score += 1;

  if (score >= 8) return { group: "A", score, label: "กลุ่ม A — ควรติดต่อก่อน", reason: reasons.join(" • "), tone: "border-green-200 bg-green-50 text-green-800" };
  if (score >= 5) return { group: "B", score, label: "กลุ่ม B — ขอข้อมูลเพิ่ม", reason: reasons.join(" • ") || "ข้อมูลความพร้อมยังไม่ครบ", tone: "border-yellow-200 bg-yellow-50 text-yellow-900" };
  return { group: "C", score, label: "กลุ่ม C — ยังไม่ควรโทร", reason: "ทำเล งบลงทุน หรือทุนสำรองยังไม่พร้อม ควรส่งข้อความให้เตรียมข้อมูลก่อน", tone: "border-red-200 bg-red-50 text-red-800" };
}
