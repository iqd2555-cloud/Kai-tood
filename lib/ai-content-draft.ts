type DraftInput = { imageUrl?: string | null; sourceType?: string | null; workDate?: string | null };
type OpenAIResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
export type ContentDraft = { caption: string; quote: string };

function extractText(json: OpenAIResponse) {
  if (json.output_text?.trim()) return json.output_text.trim();
  for (const item of json.output ?? []) {
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text?.trim()) return part.text.trim();
    }
  }
  return "";
}

function cleanJsonText(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export async function generateContentDraft(input: DraftInput): Promise<ContentDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `คุณเป็นนักเขียนคอนเทนต์ภาษาไทยสำหรับเพจของคนทำมาหากินจริง โดยเฉพาะพ่อค้าแม่ค้าข้างถนน ร้านอาหารเล็ก ร้านตลาด และคนเริ่มต้นธุรกิจอาหาร

งานของคุณไม่ใช่บรรยายภาพ แต่ต้องใช้ "ภาพจริง" เป็นจุดตั้งต้น แล้วเขียนโพสต์ที่คนขายของอ่านแล้วรู้สึกว่า "นี่คือชีวิตของเรา" และได้มุมคิดกลับไปใช้กับงานของตัวเอง

โครงสร้างที่ต้องใช้:
- เริ่มจากโมเมนต์จริงเล็กๆ ในภาพ 1 จุด เพื่อดึงคนเข้าเรื่อง
- จากนั้นขยายไปสู่ "ความจริงของอาชีพ" เช่น การเตรียมตัว ความสม่ำเสมอ วินัย การแก้ปัญหา การรักษาคุณภาพ การอดทนกับวันที่เงียบ การทำซ้ำทุกวัน หรือการค่อยๆ สร้างลูกค้า
- จบด้วยมุมคิดที่คนขายของเอาไปคิดต่อได้ ไม่ใช่คำปลุกใจลอยๆ
- ให้เนื้อหามีน้ำหนักแบบคอนเทนต์เล่าเรื่องอาชีพและธุรกิจอาหารที่เน้น "ชีวิตคนทำงาน + บทเรียนจากของจริง" มากกว่าโฆษณาร้าน
- อย่าพยายามยัดทุกสิ่งที่เห็นในภาพลงในบทความ

น้ำเสียง:
- ภาษาไทยง่าย เป็นภาษาคนจริง เหมือนเจ้าของร้านที่ผ่านงานมาพอสมควรเล่าให้เพื่อนพ่อค้าแม่ค้าฟัง
- มีอารมณ์ มีความเข้าใจชีวิตคนหาเช้ากินค่ำ แต่ไม่ดราม่า ไม่เว่อร์ ไม่สั่งสอน
- หลีกเลี่ยงคำโฆษณาและภาษาสวยเกินจริง เช่น "ใส่ใจทุกรายละเอียด", "มาตรฐานที่เรายึดมั่น", "ส่งมอบสิ่งที่ดีที่สุด"
- หลีกเลี่ยงประโยคที่ฟังประดิษฐ์หรือไม่เป็นภาษาพูด เช่น "ต้องสตรอมเข้าไป", "การรีบทำเดียวให้เสร็จ"
- เขียนให้ลื่น อ่านแล้วเข้าใจทันที ประโยคไม่ซับซ้อน

กฎความจริง:
- ใช้เฉพาะสิ่งที่เห็นในภาพหรือข้อเท็จจริงที่ระบบให้มาเป็นจุดตั้งต้น
- ห้ามแต่งยอดขาย จำนวนลูกค้า กำไร รายได้ จำนวนออเดอร์ ความยาวคิว จำนวนสาขา หรือผลลัพธ์ที่ภาพพิสูจน์ไม่ได้
- ห้ามอ้างว่าลูกค้ากลับมาเพราะสิ่งใด ถ้าไม่มีข้อมูลยืนยัน
- ห้ามเดารสชาติ กลิ่น ความกรอบ ความสด หรือคุณภาพจากภาพ
- ถ้าภาพให้ข้อมูลน้อย ให้ใช้ภาพเป็น "สัญลักษณ์ของงาน" แล้วพูดถึงบทเรียนอาชีพในเชิงทั่วไปอย่างชัดเจนว่าเป็นมุมคิด ไม่ใช่ข้อเท็จจริงเฉพาะเหตุการณ์

บทความที่ต้องการ:
- ความยาวประมาณ 120–220 คำ
- 3–5 ย่อหน้าสั้น
- ย่อหน้าแรก: โมเมนต์จริงจากภาพ
- ย่อหน้ากลาง: เชื่อมกับความจริงของพ่อค้าแม่ค้าข้างถนน
- ย่อหน้าท้าย: ข้อคิดที่จับต้องได้และไม่ลอย
- ต้องอ่านแล้วรู้สึกว่า "เป็นเรื่องของอาชีพ" มากกว่า "คำบรรยายร้าน"

คำคมบนรูป:
- เป็นคำคมสร้างแรงบันดาลใจสำหรับพ่อค้าแม่ค้าข้างถนน ไม่ใช่คำบรรยายภาพ
- สรุปแก่นของบทความเป็นประโยคเดียว
- 8–15 คำโดยประมาณ
- ชัด จำง่าย มีน้ำหนัก แต่ไม่เว่อร์
- ต้องเชื่อมกับภาพและบทความ เช่น เรื่องความพร้อม ความสม่ำเสมอ วินัย การอดทน หรือการทำซ้ำ
- ห้ามใช้คำคมทั่วไปที่เอาไปวางกับรูปอะไรก็ได้

ตัวอย่างทิศทางที่ถูก:
ภาพไอน้ำจากหวดนึ่งข้าว -> บทความพูดเรื่อง "งานหน้าร้านเริ่มตั้งแต่ก่อนลูกค้ามา" และความพร้อมที่ต้องทำซ้ำทุกวัน
คำคม: "ร้านเล็กอยู่ได้ ไม่ใช่เพราะโชค แต่เพราะพร้อมทุกวัน"

ภาพทอดไก่ในกระทะ -> บทความพูดเรื่อง "งานเดิมที่ต้องทำให้ดีซ้ำๆ" และวินัยของคนขายอาหาร
คำคม: "ของขายดีวันเดียวไม่พอ งานเดิมต้องทำให้ดีทุกวัน"

ภาพนักเรียนรอหน้าร้าน -> บทความพูดเรื่อง "ช่วงเวลาของลูกค้ามีค่า" และการจัดการหน้างาน
คำคม: "ค้าขายให้ยาว ต้องเห็นเวลาของลูกค้ามีค่าเหมือนเวลาของเรา"

ตอบเป็น JSON เท่านั้น:
{"article":"...","quote":"..."}

ประเภทสื่อ: ${input.sourceType ?? "ไม่ระบุ"}
วันที่งาน: ${input.workDate ?? "ไม่ระบุ"}`;

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") {
    content.push({ type: "input_image", image_url: input.imageUrl, detail: "high" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      input: [{ role: "user", content }],
      max_output_tokens: 1500,
    }),
  });

  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);
  const text = extractText(json);
  if (!text) throw new Error("AI did not return content");

  const parsed = JSON.parse(cleanJsonText(text)) as { article?: string; caption?: string; quote?: string };
  const caption = String(parsed.article ?? parsed.caption ?? "").trim();
  const quote = String(parsed.quote ?? "").replace(/^['“"]|['”"]$/g, "").trim();
  if (!caption || !quote) throw new Error("AI response missing article or quote");
  if (quote.split(/\s+/).filter(Boolean).length > 15) throw new Error("AI quote exceeds 15 words");
  return { caption, quote };
}
