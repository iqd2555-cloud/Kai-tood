import assert from "node:assert/strict";
import { mapGoogleFormStandardLead } from "../lib/google-form-standard-lead.ts";

const input = {
  externalId: "sheet:123:2",
  spreadsheetId: "sheet",
  sheetName: "การตอบแบบฟอร์ม 1",
  rowNumber: 2,
  submittedAt: "2026-07-27T03:30:00.000Z",
  namedValues: {
    "ชื่อ-นามสกุล": ["สมชาย ใจดี"],
    "เบอร์โทรศัพท์ / LINE ID": ["081-234-5678 / somchai.line"],
    "จังหวัด / อำเภอ ที่ต้องการเปิดร้าน": ["นครสวรรค์ / เมืองนครสวรรค์"],
    "ตอนนี้มีทำเลแล้วหรือยัง": ["มีทำเลแล้ว"],
    "ลักษณะทำเลที่ต้องการเปิดร้าน": ["ตลาด"],
    "งบลงทุนที่เตรียมไว้": ["40,001–60,000 บาท"],
    "มีทุนสำรองสำหรับหมุนเวียนร้านหรือไม่": ["มีทุนสำรอง 2–3 เดือน"],
    "เจ้าของสามารถอยู่ร้านเองช่วงแรกได้กี่ชั่วโมงต่อวัน": ["6–8 ชั่วโมงต่อวัน"],
    "เคยขายอาหารหรือขายของมาก่อนหรือไม่": ["เคยขายอาหาร"],
    "เป้าหมายยอดขายต่อวัน": ["2,001–3,000 บาทต่อวัน"],
    "ยืนยันความเข้าใจเบื้องต้น": ["ข้าพเจ้าเข้าใจว่าไม่มีการการันตีกำไร"],
  },
};

const mapped = mapGoogleFormStandardLead(input);
assert.equal(mapped.externalId, "sheet:123:2");
assert.equal(mapped.phoneNormalized, "0812345678");
assert.equal(mapped.lead.phone, "0812345678");
assert.equal(mapped.lead.line_id, "somchai.line");
assert.equal(mapped.lead.province, "นครสวรรค์");
assert.equal(mapped.lead.district, "เมืองนครสวรรค์");
assert.equal(mapped.lead.preferred_model, "ชุดมาตรฐาน");
assert.equal(mapped.lead.source, "google_form");
assert.equal(mapped.lead.understanding_confirmed, true);
assert.equal(mapped.lead.created_at, "2026-07-27T03:30:00.000Z");

const sameRow = mapGoogleFormStandardLead(input);
assert.equal(sameRow.externalId, mapped.externalId);
assert.equal(sameRow.payloadHash, mapped.payloadHash);

const lineOnly = mapGoogleFormStandardLead({
  externalId: "sheet:123:3",
  namedValues: {
    "ชื่อ-นามสกุล": "ผู้สมัครไม่มีเบอร์",
    "เบอร์โทรศัพท์ / LINE ID": "@line-only",
    "จังหวัด / อำเภอ ที่ต้องการเปิดร้าน": "เชียงใหม่ อำเภอเมืองเชียงใหม่",
  },
});
assert.equal(lineOnly.lead.phone, "ไม่ระบุเบอร์โทร");
assert.equal(lineOnly.lead.line_id, "@line-only");
assert.equal(lineOnly.lead.province, "เชียงใหม่");
assert.equal(lineOnly.lead.district, "เมืองเชียงใหม่");

console.log("Google Form standard lead mapping tests passed");
