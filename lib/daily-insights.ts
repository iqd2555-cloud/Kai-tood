export type DailyInsightStatus = "normal" | "check" | "missing";

export type DailyInsightOptions = {
  averagePackPrice?: number;
  chickenPacksPerKgStandard?: number;
  chickenTolerancePercent?: number;
  stickyRicePacksPerKgStandard?: number;
  stickyRiceTolerancePercent?: number;
};

export type BranchDailyInsightInput = {
  hasReport: boolean;
  totalSales: number;
  chickenReceivedKg: number;
  chickenUsedKg: number;
  chickenRemainingKg: number;
  stickyRiceUsedKg: number;
  stickyRiceRemainingKg: number;
};

const DEFAULT_OPTIONS = {
  averagePackPrice: 25,
  chickenPacksPerKgStandard: 8,
  chickenTolerancePercent: 20,
  stickyRicePacksPerKgStandard: 10,
  stickyRiceTolerancePercent: 10,
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function calculateBranchDailyInsight(report: BranchDailyInsightInput, options: DailyInsightOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const totalSales = safeNumber(report.totalSales);
  const chickenReceivedKg = safeNumber(report.chickenReceivedKg);
  const chickenUsedKg = safeNumber(report.chickenUsedKg);
  const chickenRemainingKg = safeNumber(report.chickenRemainingKg);
  const stickyRiceUsedKg = safeNumber(report.stickyRiceUsedKg);
  const stickyRiceRemainingKg = safeNumber(report.stickyRiceRemainingKg);
  const estimatedPacks = config.averagePackPrice > 0 ? totalSales / config.averagePackPrice : 0;
  const chickenPacksPerKg = ratio(estimatedPacks, chickenUsedKg);
  const stickyRicePacksPerKg = ratio(estimatedPacks, stickyRiceUsedKg);
  const chickenMinimum = config.chickenPacksPerKgStandard * (1 - config.chickenTolerancePercent / 100);
  const stickyRiceMinimum = config.stickyRicePacksPerKgStandard * (1 - config.stickyRiceTolerancePercent / 100);
  const abnormalFlags: string[] = [];
  const recommendations: string[] = [];

  if (!report.hasReport) {
    abnormalFlags.push("ไม่มีการส่งรายงานจากสาขา");
    recommendations.push("ติดตามให้สาขาส่งรายงานประจำวันก่อนสรุปยอด");
  }
  if (chickenUsedKg > 0 && chickenPacksPerKg !== null && chickenPacksPerKg < chickenMinimum) {
    abnormalFlags.push("ยอดขายกับปริมาณไก่หมักที่ใช้ไปไม่สัมพันธ์กัน ไก่ 1 กก. ได้ต่ำกว่ามาตรฐานที่ยอมรับได้");
    recommendations.push("ควรตรวจสอบการชั่งไก่ การบันทึกยอดขาย หรือการห่อสินค้า");
  }
  if (stickyRiceUsedKg > 0 && stickyRicePacksPerKg !== null && stickyRicePacksPerKg < stickyRiceMinimum) {
    abnormalFlags.push("ยอดขายกับปริมาณข้าวเหนียวที่ใช้ไปไม่สัมพันธ์กัน ข้าวเหนียว 1 กก. ได้ต่ำกว่ามาตรฐานที่ยอมรับได้");
    recommendations.push("ควรตรวจสอบการชั่งข้าวเหนียว การนึ่ง และการบันทึกยอดขาย");
  }
  if (totalSales > 0 && chickenUsedKg === 0) abnormalFlags.push("ยอดขายมากกว่า 0 แต่ไก่ใช้ไป = 0");
  if (totalSales > 0 && stickyRiceUsedKg === 0) abnormalFlags.push("ยอดขายมากกว่า 0 แต่ข้าวเหนียวใช้ไป = 0");
  if (chickenRemainingKg < 0) abnormalFlags.push("ไก่คงเหลือติดลบ");
  if (stickyRiceRemainingKg < 0) abnormalFlags.push("ข้าวเหนียวคงเหลือติดลบ");
  if (chickenReceivedKg > 0 && chickenUsedKg === 0) abnormalFlags.push("มีรับเข้า แต่ไม่มีใช้ไก่เลย");
  if (chickenUsedKg >= 20 && totalSales < chickenUsedKg * config.averagePackPrice * chickenMinimum) abnormalFlags.push("มีใช้ไก่เยอะผิดปกติแต่ยอดขายต่ำ");

  const status: DailyInsightStatus = !report.hasReport ? "missing" : abnormalFlags.length > 0 ? "check" : "normal";
  return { estimatedPacks, chickenPacksPerKg, stickyRicePacksPerKg, abnormalFlags, recommendations: [...new Set(recommendations)], status, chickenMinimum, stickyRiceMinimum };
}
