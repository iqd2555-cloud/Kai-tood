type DraftInput = {
  imageUrl?: string | null;
  sourceType?: string | null;
  workDate?: string | null;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
  status?: string;
};

export type ContentDraft = { caption: string; quote: string };

function extractText(json: OpenAIResponse): string {
  if (typeof json.output_text === "string" && json.output_text.trim()) return json.output_text.trim();
  for (const item of json.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && typeof part.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

export async function generateContentDraft(input: DraftInput): Promise<ContentDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `คุณเป็นผู้ช่วยเขียนคอนเทนต์ของแบรนด์ “เหนียวไก่เยอะโคตร” จากสื่อจริงที่พนักงานส่งมา

เป้าหมายคือเขียนเหมือนเจ้าของร้านเห็นเหตุการณ์จริงแล้วเล่าออกมาจากความรู้สึก ไม่ใช่ AI ที่ไล่บรรยายวัตถุทุกอย่างในภาพ

สร้าง 2 ส่วนที่แยกจากกันชัดเจน:
1) article: บทความ/โพสต์ Facebook ภาษาไทยประมาณ 100–220 คำ 3–6 ย่อหน้าสั้น มี “โมเมนต์ + ความรู้สึก + มุมคิด” ที่สัมพันธ์กับภาพ ไม่ใช่เพียงคำบรรยายภาพ และไม่ต้องยืดให้ครบจำนวนคำถ้าข้อมูลมีน้อย
2) quote: คำคมสั้นสำหรับวางบนภาพ ไม่เกิน 15 คำ สื่อเพียง 1 ประเด็นและต้องสัมพันธ์กับโมเมนต์ของภาพ

วิธีมองภาพก่อนเขียน:
- อย่าเริ่มจากคำถามว่า “ในภาพมีอะไรบ้าง” ให้เริ่มจาก “ภาพนี้กำลังเล่าเหตุการณ์อะไร” และ “ถ้าเจ้าของร้านยืนอยู่ตรงนี้ เขาน่าจะรู้สึกหรือคิดอะไร”
- เลือกเพียงหนึ่งเหตุการณ์หลัก เช่น เด็กๆ มารอหน้าร้าน ช่วงเร่งมือ เตรียมของก่อนลูกค้าเข้ามา เบื้องหลังการทอด การนึ่ง การห่อ หรือบรรยากาศทีมงาน
- ใช้รายละเอียดภาพเท่าที่จำเป็นเพื่อให้คนเห็นภาพ ไม่ต้องแจกแจงวัตถุ สี ป้าย รถ หรืออุปกรณ์ครบทุกชิ้น
- ให้คนอ่านรู้สึกถึงบรรยากาศ เช่น รีบ ชุลมุน อบอุ่น เอ็นดู ตั้งใจ เหนื่อยแต่คุ้ม หรือโล่งใจ เมื่อสิ่งที่เห็นและบริบทสนับสนุน

การใส่อารมณ์โดยไม่แต่งเรื่อง:
- อนุญาตให้เขียน “ความรู้สึกของผู้เล่า” หรือการตีความบรรยากาศจากภาพได้ เช่น “เห็นเด็กๆ มารอก็ต้องรีบมือกันหน่อย” หรือ “ภาพแบบนี้เห็นแล้วหายเหนื่อย”
- ความรู้สึกภายในของบุคคลอื่นที่มองไม่เห็น ห้ามยืนยันเป็นข้อเท็จจริง เช่น ห้ามเขียนว่า “เด็กๆ หิวมาก” หรือ “พนักงานเครียด” ถ้าภาพไม่ยืนยัน
- ถ้าต้องการสื่อเจตนาหรือความรู้สึกที่อนุมาน ให้เล่าเป็นมุมมองของเจ้าของ เช่น “ช่วงก่อนเข้าเรียนแบบนี้ก็อดคิดไม่ได้ว่าอยากให้เด็กๆ ได้ของไวหน่อย” แทนการอ้างว่าทุกคนคิดแบบนั้น

กฎข้อเท็จจริง:
- อ้างได้เฉพาะสิ่งที่เห็นในสื่อหรือข้อเท็จจริงที่ยืนยันได้เท่านั้น
- ห้ามแต่งยอดขาย จำนวนลูกค้าแบบตัวเลข คิวยาว รายได้ กำไร ผลลัพธ์ จำนวนออเดอร์ จำนวนสาขา ปริมาณอาหาร หรือความสำเร็จ
- ห้ามเดารสชาติ กลิ่น ความกรอบ ความสด หรือคุณภาพที่ภาพพิสูจน์ไม่ได้
- บทความสามารถให้ข้อคิดเชิงการทำงาน/ค้าขายจากสิ่งที่เห็นได้ แต่ต้องไม่เขียนให้ดูเหมือนเหตุการณ์ที่เกิดขึ้นจริงถ้าภาพไม่ได้ยืนยัน
- ภาษาไทยง่าย คม ชัด เป็นภาษาพูดเหมือนเจ้าของร้านเขียนเอง ไม่เป็นภาษานักโฆษณา ไม่เว่อร์ ไม่ปลุกใจลอยๆ
- เปิดเรื่องให้น่าอ่านจากโมเมนต์หรือความรู้สึก ไม่ใช่จากการแจกแจงสิ่งของ
- quote ต้องสัมพันธ์กับภาพจริง ห้ามเป็นคำคมลอยๆ
- หากเป็นวิดีโอและไม่มีเฟรม ให้เขียนกลางๆ ไม่บรรยายสิ่งที่ไม่ได้เห็น

ตัวอย่างแนวที่ต้องการ:
ไม่เอา: “ข้าวเหนียวไก่ทอดหน้าร้านมีร่มแดงให้เห็นชัด นักเรียนยืนรออยู่หน้ารถกระบะ ทีมงานกำลังเตรียมของในแผงขาย”
เอา: “เช้านี้เด็กๆ มายืนรอข้าวเหนียวไก่ทอดหน้าร้านกันแล้ว ทีมงานก็ต้องรีบมือกันหน่อย ช่วงก่อนเข้าเรียนแบบนี้ทุกนาทีมีค่า”

ไม่เอา: “มีหวดข้าวเหนียวอยู่บนหม้อนึ่งและมีไอน้ำลอยขึ้นมา”
เอา: “ไอน้ำขึ้นแบบนี้ทีไร รู้เลยว่าอีกไม่นานต้องเริ่มวิ่งกันแล้ว ช่วงเตรียมร้านเป็นช่วงเงียบๆ ที่งานไม่เคยเงียบตาม”

ก่อนส่งคำตอบให้ตรวจ 3 ข้อ:
1) ฟังเหมือนคนจริงหรือยัง
2) คนอ่านรู้สึกอะไรจากโพสต์นี้หรือยัง
3) มีประโยคไหนแต่งเป็นข้อเท็จจริงเกินภาพหรือไม่ ถ้ามีให้แก้

ตอบเป็น JSON เท่านั้นรูปแบบ:
{"article":"...","quote":"..."}

ประเภทสื่อ: ${input.sourceType ?? "ไม่ระบุ"}
วันที่งาน: ${input.workDate ?? "ไม่ระบุ"}`;

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") content.push({ type: "input_image", image_url: input.imageUrl, detail: "high" });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      input: [{ role: "user", content }],
      max_output_tokens: 1400,
    }),
  });
  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);
  const text = extractText(json);
  if (!text) throw new Error(`AI did not return content (status: ${json.status ?? "unknown"})`);

  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as { article?: string; caption?: string; quote?: string };
  const caption = String(parsed.article ?? parsed.caption ?? "").trim();
  const quote = String(parsed.quote ?? "").trim();
  if (!caption || !quote) throw new Error("AI response missing article or quote");
  if (quote.split(/\s+/).filter(Boolean).length > 15) throw new Error("AI quote exceeds 15 words");
  return { caption, quote };
}
