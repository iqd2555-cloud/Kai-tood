export const MINI_INVESTMENT_BUDGET_OPTIONS = [
  "ต่ำกว่า 9,900 บาท",
  "9,900–14,999 บาท",
  "15,000–20,000 บาท",
  "มากกว่า 20,000 บาท",
] as const;

export const MINI_LEGACY_INVESTMENT_BUDGET = "ไม่ระบุ — ใบสมัครเดิม";

export function evaluateMiniInvestmentBudget(value: string | null | undefined) {
  if (value === "ต่ำกว่า 9,900 บาท") {
    return {
      belowMinimum: true,
      score: 0,
      reason: "งบประมาณต่ำกว่าราคาแฟรนไชส์ MINI STARTER 9,900 บาท",
    };
  }

  if (value === "9,900–14,999 บาท") {
    return { belowMinimum: false, score: 1, reason: "ผ่านงบลงทุนขั้นต่ำ" };
  }

  if (value === "15,000–20,000 บาท") {
    return { belowMinimum: false, score: 2, reason: "มีงบลงทุนและเงินเผื่อระดับหนึ่ง" };
  }

  if (value === "มากกว่า 20,000 บาท") {
    return { belowMinimum: false, score: 3, reason: "มีงบลงทุนค่อนข้างพร้อม" };
  }

  return {
    belowMinimum: false,
    score: 0,
    reason: "ยังไม่มีข้อมูลงบลงทุนรวม ต้องขอข้อมูลก่อนโทร",
  };
}
