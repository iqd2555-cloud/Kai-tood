type CaptionInput = {
  imageUrl?: string | null;
  sourceType?: string | null;
  workDate?: string | null;
};

type ResponseContentPart = { type?: string; text?: string };
type ResponseOutputItem = { content?: ResponseContentPart[] };
type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutputItem[];
  error?: { message?: string };
};

export async function generateContentCaption(input: CaptionInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `คุณเป็นผู้ช่วยเขียนคอนเทนต์ภาษาไทยให้แบรนด์ร้านข้าวเหนียวไก่ทอด “เหนียวไก่เยอะโคตร”
เขียนแคปชัน Facebook/Instagram จากสื่อจริงที่พนักงานส่งมา ใช้ภาษาไทยง่าย เป็นธรรมชาติ คมชัด แบบคนทำธุรกิจข้างถนนจริง
กฎสำคัญ:
- ห้ามแต่งยอดขาย จำนวนลูกค้า คิว กำไร ผลลัพธ์ จำนวนสาขา หรือเหตุการณ์ที่ภาพไม่ได้ยืนยัน
- ห้ามอ้างว่าขายดี คนแน่น ของหมด หรือประสบความสำเร็จ ถ้าสื่อไม่ได้พิสูจน์
- ถ้าเห็นข้อมูลไม่พอ ให้เขียนเฉพาะสิ่งที่เห็นและมุมการทำงานจริง
- ไม่เว่อร์ ไม่ใช้คำโฆษณาเกินจริง ไม่ชมตัวเองลอยๆ
- เน้นเบื้องหลังการทำงาน คุณภาพ ความสม่ำเสมอ การบริการ หรือรายละเอียดอาหารตามที่เห็นจริง
- ความยาวประมาณ 2–5 ประโยค อ่านง่าย พร้อมโพสต์
- ไม่ต้องใส่หัวข้อ “แคปชัน” และไม่ต้องอธิบายวิธีคิด
ประเภทสื่อ: ${input.sourceType ?? "ไม่ระบุ"}
วันที่งาน: ${input.workDate ?? "ไม่ระบุ"}`;

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") {
    content.push({ type: "input_image", image_url: input.imageUrl, detail: "low" });
  } else if (input.sourceType === "video") {
    content.push({ type: "input_text", text: "รายการนี้เป็นวิดีโอ ระบบยังไม่ได้ส่งเฟรมวิดีโอให้โมเดล จึงห้ามบรรยายรายละเอียดภาพที่ไม่ได้เห็น ให้เขียนแคปชันกลางๆ เกี่ยวกับเบื้องหลังการทำงานจริงจากคลิปพนักงาน โดยไม่สร้างข้อเท็จจริงเพิ่ม" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      input: [{ role: "user", content }],
      max_output_tokens: 500,
    }),
  });

  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);

  let text = typeof json.output_text === "string" ? json.output_text : undefined;
  if (!text) {
    for (const item of json.output ?? []) {
      const part = item.content?.find((candidate) => candidate.type === "output_text" && typeof candidate.text === "string");
      if (part?.text) {
        text = part.text;
        break;
      }
    }
  }

  if (!text?.trim()) throw new Error("AI did not return a caption");
  return text.trim();
}
