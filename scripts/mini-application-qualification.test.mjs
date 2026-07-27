import assert from "node:assert/strict";
import { qualifyMiniApplication } from "../lib/mini-application-qualification.ts";

const readyApplication = {
  status: "new",
  has_location: "มีทำเลแล้ว",
  investment_budget_range: "9,900–14,999 บาท",
  location_description: "หน้า CJ อำเภอเมืองนครสวรรค์",
  location_address: "ถนนสวรรค์วิถี",
  actual_seller: "เจ้าของขายเอง",
  ready_to_open: "ภายใน 30 วัน",
};

const belowMinimum = qualifyMiniApplication({
  ...readyApplication,
  investment_budget_range: "ต่ำกว่า 9,900 บาท",
});
assert.equal(belowMinimum.group, "C");
assert.equal(belowMinimum.score, 0);
assert.equal(belowMinimum.label, "กลุ่ม C — ไม่ต้องโทรกลับ");
assert.match(belowMinimum.reason, /ต่ำกว่าราคาแฟรนไชส์ MINI STARTER 9,900 บาท/);

const exactlyMinimum = qualifyMiniApplication(readyApplication);
assert.equal(exactlyMinimum.group, "A");
assert.equal(exactlyMinimum.score, 8);

const midBudget = qualifyMiniApplication({
  ...readyApplication,
  investment_budget_range: "15,000–20,000 บาท",
});
assert.equal(midBudget.score, 9);

const highBudget = qualifyMiniApplication({
  ...readyApplication,
  investment_budget_range: "มากกว่า 20,000 บาท",
});
assert.equal(highBudget.score, 10);

const legacyApplication = qualifyMiniApplication({
  ...readyApplication,
  investment_budget_range: "ไม่ระบุ — ใบสมัครเดิม",
});
assert.equal(legacyApplication.group, "B");
assert.equal(legacyApplication.score, 7);
assert.match(legacyApplication.reason, /ต้องขอข้อมูลก่อนโทร/);

console.log("MINI application qualification tests passed");
