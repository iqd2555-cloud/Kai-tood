import type { MiniFranchiseApplication } from "@/lib/types";

export type MiniQualification = {
  group: "A" | "B" | "C";
  score: number;
  label: string;
  reason: string;
  tone: string;
};

export function qualifyMiniApplication(
  application: Pick<MiniFranchiseApplication, "status" | "has_location" | "extra_budget_range" | "location_description" | "location_address" | "actual_seller" | "ready_to_open">,
): MiniQualification {
  if (application.status === "area_conflict" || application.status === "rejected") {
    return {
      group: "C",
      score: 0,
      label: "กลุ่ม C — ยังไม่ควรโทร",
      reason: application.status === "area_conflict" ? "พื้นที่ซ้ำหรืออยู่ระหว่างตรวจสอบเขตคุ้มครอง" : "ใบสมัครไม่ผ่าน",
      tone: "border-red-200 bg-red-50 text-red-800",
    };
  }

  let score = 0;
  const reasons: string[] = [];
  if (application.has_location === "มีทำเลแล้ว") {
    score += 3;
    reasons.push("มีทำเลแล้ว");
  } else if (application.has_location === "กำลังเจรจา") {
    score += 2;
    reasons.push("กำลังเจรจาทำเล");
  }

  if (["10,001–20,000 บาท", "มากกว่า 20,000 บาท"].includes(application.extra_budget_range)) {
    score += 3;
    reasons.push("มีงบเพิ่มเติม");
  } else if (application.extra_budget_range === "5,000–10,000 บาท") {
    score += 2;
    reasons.push("มีงบระดับเริ่มต้น");
  } else if (application.extra_budget_range === "ต่ำกว่า 5,000 บาท") {
    score += 1;
  }

  if (application.location_description.trim() && application.location_address.trim()) {
    score += 2;
    reasons.push("ข้อมูลทำเลชัดเจน");
  }
  if (application.actual_seller.trim()) score += 1;
  if (application.ready_to_open.trim()) score += 1;

  if (score >= 8) return { group: "A", score, label: "กลุ่ม A — ควรติดต่อก่อน", reason: reasons.join(" • "), tone: "border-green-200 bg-green-50 text-green-800" };
  if (score >= 5) return { group: "B", score, label: "กลุ่ม B — ขอข้อมูลเพิ่ม", reason: reasons.join(" • ") || "ข้อมูลความพร้อมยังไม่ครบ", tone: "border-yellow-200 bg-yellow-50 text-yellow-900" };
  return { group: "C", score, label: "กลุ่ม C — ยังไม่ควรโทร", reason: "ทำเลหรืองบประมาณยังไม่พร้อม ควรส่งข้อความให้เตรียมข้อมูลก่อน", tone: "border-red-200 bg-red-50 text-red-800" };
}
