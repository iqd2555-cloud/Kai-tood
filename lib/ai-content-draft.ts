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

สร้าง 2 ส่วนที่แยกจากกันชัดเจน:
1) article: บทความ/โพสต์ Facebook ภาษาไทยแบบเจ้าของร้านเล่าจากงานจริง ประมาณ 100–220 คำ 3–6 ย่อหน้าสั้น มีประเด็นหรือข้อคิดที่สัมพันธ์กับภาพ ไม่ใช่เพียงคำบรรยายภาพ และไม่ต้องยืดให้ครบจำนวนคำหากข้อเท็จจริงในภาพมีน้อย
2) quote: คำคมสั้นสำหรับวางบนภาพ ไม่เกิน 15 คำ สื่อเพียง 1 ประเด็น

กฎสำคัญ:
- อ้างได้เฉพาะสิ่งที่เห็นในสื่อหรือข้อเท็จจริงที่ยืนยันได้เท่านั้น
- ห้ามแต่งยอดขาย จำนวนลูกค้า คิวยาว รายได้ กำไร ผลลัพธ์ จำนวนออเดอร์ จำนวนสาขา หรือความสำเร็จ
- ห้ามเดารสชาติ กลิ่น ความกรอบ ความสด เวลา ความรู้สึก เจตนา หรือเหตุการณ์ที่ภาพไม่ได้ยืนยัน
- บทความสามารถให้ข้อคิดเชิงการทำงาน/ค้าขายจากสิ่งที่เห็นได้ แต่ต้องแยกข้อคิดออกจากข้อเท็จจริง ไม่เขียนให้ดูเหมือนเหตุการณ์ที่เกิดขึ้นจริงถ้าภาพไม่ได้ยืนยัน
- ภาษาไทยง่าย คม ชัด เหมือนเจ้าของร้านเขียนเอง ไม่เป็นภาษานักโฆษณา ไม่เว่อร์ ไม่ปลุกใจลอยๆ
- เปิดเรื่องให้น่าอ่าน แต่ห้าม clickbait ที่เกินจริง
- quote ต้องสัมพันธ์กับภาพจริง ห้ามเป็นคำคมลอยๆ
- หากข้อมูลจากภาพมีน้อย ให้ลดรายละเอียดข้อเท็จจริง แต่ยังสามารถเขียนบทเรียน/มุมคิดที่มีเหตุผลจากภาพได้โดยไม่สร้างเรื่อง
- หากเป็นวิดีโอและไม่มีเฟรม ให้เขียนกลางๆ ไม่บรรยายสิ่งที่ไม่ได้เห็น

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
