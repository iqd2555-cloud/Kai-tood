import { generateContentCaption } from "@/lib/ai-caption";

type DraftInput = { imageUrl?: string | null; sourceType?: string | null; workDate?: string | null };
type OpenAIResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
export type ContentDraft = { caption: string; quote: string };
function extractText(json: OpenAIResponse) { if (json.output_text?.trim()) return json.output_text.trim(); for (const item of json.output ?? []) for (const part of item.content ?? []) if (part.type === "output_text" && part.text?.trim()) return part.text.trim(); return ""; }

export async function generateContentDraft(input: DraftInput): Promise<ContentDraft> {
  // ใช้น้ำเสียงที่เจ้าของอนุมัติเป็นฐานจับโมเมนต์จริงก่อน แล้วค่อยต่อยอดเป็นบทความสร้างแรงบันดาลใจ
  const baseMoment = await generateContentCaption(input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `คุณเป็นผู้ช่วยเขียนคอนเทนต์ของแบรนด์ “เหนียวไก่เยอะโคตร” สำหรับกลุ่มพ่อค้าแม่ค้าข้างถนน

ต่อยอดจากโมเมนต์จริงด้านล่างให้ได้ 2 ส่วนที่เชื่อมกัน:
1) article = บทความสร้างแรงบันดาลใจพ่อค้าแม่ค้าข้างถนน ภาษาไทยง่ายแบบคนจริง 100–220 คำ 3–6 ย่อหน้าสั้น
2) quote = คำคมสร้างแรงบันดาลใจสำหรับพ่อค้าแม่ค้าข้างถนน 8–15 คำ สั้น คม จำง่าย และสรุปแก่นเดียวกับ article

หลักการเขียน article:
- เปิดจากโมเมนต์จริงในภาพ/ข้อความฐาน ไม่เขียนแบบบรรยายวัตถุทุกอย่าง
- เชื่อมจากสิ่งที่เกิดขึ้นจริงไปสู่มุมคิดของคนทำมาหากิน เช่น ความสม่ำเสมอ การเตรียมพร้อม ความอดทน การรักษามาตรฐาน การทำงานทุกวัน หรือการไม่หยุดพัฒนาตัวเอง
- ต้องรู้สึกเหมือนเจ้าของร้านเล่าจากประสบการณ์ ไม่ใช่บทความ AI และไม่ใช่คำปลุกใจลอยๆ
- ใช้ภาษาพูด ธรรมชาติ จริงใจ ไม่โอเวอร์ ไม่สวยหรูเกินชีวิตจริง
- หนึ่งโพสต์มีเพียงหนึ่งแก่นหลัก อ่านแล้วคนค้าขายเอาไปคิดต่อได้

หลักการเขียน quote:
- ต้องเป็น “คำคมสร้างแรงบันดาลใจพ่อค้าแม่ค้าข้างถนน” ไม่ใช่คำบรรยายภาพ
- ต้องสรุปแก่นจาก article และยังเชื่อมโยงกับโมเมนต์ในภาพ
- ไม่ใช้คำคมทั่วไปที่ใช้ได้กับทุกภาพ เช่น “สู้ๆ อย่ายอมแพ้”
- ไม่บรรยายสิ่งของตรงๆ เช่น “ไอน้ำขึ้นแล้ว เตรียมกระติ๊บได้เลย”
- ฟังแล้วเหมือนประโยคที่เจ้าของร้านพูดจากประสบการณ์จริง
- 8–15 คำ และไม่ใส่เครื่องหมายคำพูด

กฎข้อเท็จจริง:
- ห้ามแต่งยอดขาย จำนวนลูกค้า กำไร รายได้ ออเดอร์ จำนวนสาขา หรือผลลัพธ์ที่สื่อไม่ได้ยืนยัน
- ห้ามเดารสชาติ กลิ่น ความกรอบ ความสด หรือคุณภาพที่ภาพพิสูจน์ไม่ได้
- ถ้าข้อมูลไม่พอ ให้ใช้สิ่งที่เห็นเป็นจุดตั้งต้นแล้วพูดเป็น “มุมคิด” ไม่ใช่แต่งเหตุการณ์

ตัวอย่างทิศทางที่ต้องการ:
โมเมนต์: กำลังนึ่งข้าวเหนียวก่อนเปิดร้าน
article direction: งานขายไม่ได้เริ่มตอนลูกค้าคนแรกมา แต่มันเริ่มจากการเตรียมของให้พร้อมก่อนเวลา คนค้าขายอาจไม่ได้มีวันที่ง่ายทุกวัน แต่ความสม่ำเสมอคือสิ่งที่ทำให้ร้านเดินต่อได้
quote: “ร้านที่พร้อมก่อนลูกค้ามา มักไปได้ไกลกว่าร้านที่รอให้ปัญหามาถึง”

โมเมนต์: ทอดของต่อเนื่องช่วงงานเร่ง
article direction: ช่วงงานยุ่งทำให้เห็นว่าระบบและความนิ่งสำคัญกว่าความรีบ คนขายของไม่ได้ชนะเพราะวิ่งเร็วที่สุด แต่เพราะทำซ้ำสิ่งสำคัญได้ดีทุกวัน
quote: “ขายของให้รอด ไม่ใช่รีบที่สุด แต่ต้องนิ่งและทำดีให้ได้ทุกวัน”

ข้อความฐานจากภาพจริง:
${baseMoment}

วันที่งาน: ${input.workDate ?? "ไม่ระบุ"}

ตอบเป็น JSON เท่านั้น:
{"article":"...","quote":"..."}`;

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") content.push({ type: "input_image", image_url: input.imageUrl, detail: "high" });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-5-mini", reasoning: { effort: "minimal" }, input: [{ role: "user", content }], max_output_tokens: 1400 }),
  });
  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);
  const text = extractText(json).replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  if (!text) throw new Error("AI did not return content");
  const parsed = JSON.parse(text) as { article?: string; quote?: string };
  const caption = String(parsed.article ?? "").trim();
  const quote = String(parsed.quote ?? "").replace(/^['“"]|['”"]$/g, "").trim();
  if (!caption || !quote) throw new Error("AI response missing article or quote");
  const words = quote.split(/\s+/).filter(Boolean);
  if (words.length > 15) throw new Error("AI quote exceeds 15 words");
  return { caption, quote };
}
