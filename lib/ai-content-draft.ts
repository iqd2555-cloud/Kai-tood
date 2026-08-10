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

  const prompt = `คุณเป็นผู้ช่วยคอนเทนต์ของแบรนด์ “เหนียวไก่เยอะโคตร” จากสื่อจริงที่พนักงานส่งมา

สร้าง 2 อย่างพร้อมกัน:
1) caption ภาษาไทย 1–3 ประโยค ไม่เกินประมาณ 60 คำ
2) quote ภาษาไทยสั้นๆ สำหรับวางบนภาพ ไม่เกิน 15 คำ และสื่อเพียง 1 ประเด็น

กฎสำคัญ:
- อ้างได้เฉพาะสิ่งที่เห็นหรือข้อมูลที่ยืนยันได้เท่านั้น
- ห้ามแต่งยอดขาย จำนวนลูกค้า คิวยาว รายได้ กำไร ผลลัพธ์ จำนวนออเดอร์ จำนวนสาขา หรือความสำเร็จ
- ห้ามเดารสชาติ กลิ่น ความกรอบ ความสด เวลา ความรู้สึก หรือเจตนา
- ถ้าข้อมูลไม่พอ ให้เขียนให้น้อยลง
- ภาษาไทยง่าย เหมือนเจ้าของร้านเล่าจากงานจริง ไม่เป็นภาษานักโฆษณา
- quote ต้องสัมพันธ์กับภาพจริง ห้ามเป็นคำคมลอยๆ และต้องไม่บดบังข้อเท็จจริงในภาพ
- หากเป็นวิดีโอและไม่มีเฟรม ให้เขียนกลางๆ ไม่บรรยายสิ่งที่ไม่ได้เห็น

ตอบเป็น JSON เท่านั้นรูปแบบ:
{"caption":"...","quote":"..."}

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
      max_output_tokens: 800,
    }),
  });
  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);
  const text = extractText(json);
  if (!text) throw new Error(`AI did not return content (status: ${json.status ?? "unknown"})`);

  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<ContentDraft>;
  const caption = String(parsed.caption ?? "").trim();
  const quote = String(parsed.quote ?? "").trim();
  if (!caption || !quote) throw new Error("AI response missing caption or quote");
  if (quote.split(/\s+/).filter(Boolean).length > 15) throw new Error("AI quote exceeds 15 words");
  return { caption, quote };
}
