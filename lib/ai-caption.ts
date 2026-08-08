type CaptionInput = {
  imageUrl?: string | null;
  sourceType?: string | null;
  workDate?: string | null;
};

type ResponseContentPart = { type?: string; text?: string };
type ResponseOutputItem = { type?: string; content?: ResponseContentPart[] };
type OpenAIResponse = {
  output_text?: string;
  output?: ResponseOutputItem[];
  error?: { message?: string };
  status?: string;
  incomplete_details?: { reason?: string } | null;
};

export async function generateContentCaption(input: CaptionInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = `คุณเป็นผู้ช่วยเขียนคอนเทนต์ภาษาไทยให้แบรนด์ร้านข้าวเหนียวไก่ทอด “เหนียวไก่เยอะโคตร”
หน้าที่คือเขียนแคปชัน Facebook/Instagram จากสื่อจริงที่พนักงานส่งมา โดยรักษาความน่าเชื่อถือของแบรนด์เหนือความหวือหวา

กฎข้อเท็จจริง — ต้องทำตามเคร่งครัด:
- ใช้เฉพาะข้อเท็จจริงที่เห็นหรือยืนยันได้จากสื่อและข้อมูลที่ระบบส่งให้เท่านั้น
- ห้ามแต่งหรืออนุมานยอดขาย จำนวนลูกค้า ความยาวคิว กำไร รายได้ ผลลัพธ์ จำนวนสาขา จำนวนออเดอร์ ปริมาณอาหาร หรือความสำเร็จ
- ห้ามเขียนว่า “ขายดี”, “ลูกค้าแน่น”, “คิวยาว”, “ของหมด”, “ลูกค้าประจำ”, “ลูกค้าชอบ”, “สดใหม่”, “กรอบ”, “หอม”, “อร่อย”, “ร้อนๆ”, “ทำทุกวัน”, “เตรียมพร้อมก่อนเปิดร้าน” หรือข้อความเชิงข้อเท็จจริงอื่น ถ้าสื่อไม่ได้ยืนยันสิ่งนั้นจริง
- ห้ามเดาช่วงเวลา เช่น เช้านี้ วันนี้ ก่อนเปิดร้าน ช่วงเร่งด่วน ถ้าไม่มีข้อมูลยืนยัน
- ห้ามเดาความตั้งใจ ความรู้สึก คุณภาพ รสชาติ หรือผลลัพธ์จากภาพเพียงอย่างเดียว
- ถ้าข้อมูลไม่พอ ให้พูดให้น้อยลง ไม่ใช่แต่งให้เต็ม

น้ำเสียงของแบรนด์:
- ภาษาไทยง่าย เหมือนเจ้าของร้านเล่าจากงานจริง ไม่ใช่ภาษานักโฆษณาหรือบทความ AI
- สั้น กระชับ เป็นธรรมชาติ ไม่เว่อร์ ไม่ปลุกใจ ไม่ชมตัวเองลอยๆ
- ไม่ต้องพยายามขายทุกโพสต์ และไม่ต้องลงท้าย “ครับ” ทุกประโยค
- หลีกเลี่ยงคำฟุ่มเฟือย เช่น “ใส่ใจทุกรายละเอียด”, “มาตรฐานที่เรายึดมั่น”, “เพื่อส่งมอบสิ่งที่ดีที่สุด” เว้นแต่มีหลักฐานรองรับ
- เลือกเพียงหนึ่งมุมที่เด่นที่สุดจากสื่อ เช่น ขั้นตอนทำงาน อาหาร การห่อ การทอด การนึ่ง การบริการ บรรยากาศหน้าร้าน หรือเบื้องหลังจริง
- ถ้าเป็นภาพอาหาร ให้บรรยายสิ่งที่มองเห็นได้ ไม่ตัดสินรสชาติ กลิ่น ความกรอบ หรือความสด
- ถ้าเห็นลูกค้า ให้พูดได้เพียงว่ามีลูกค้าอยู่ในภาพ ห้ามขยายเป็นยอดขายดี/คิวยาว/ลูกค้าแน่น เว้นแต่หลักฐานชัดเจนจริง

รูปแบบผลลัพธ์:
- 1–3 ประโยคเป็นค่าเริ่มต้น และไม่เกินประมาณ 60 คำ
- เปิดด้วยประโยคที่เข้าเรื่องทันที ไม่ต้องมีหัวข้อ “แคปชัน”
- ไม่ต้องใส่แฮชแท็ก เว้นแต่ระบบสั่งเพิ่มภายหลัง
- ก่อนส่งคำตอบ ให้ตรวจตัวเองหนึ่งรอบว่าแต่ละข้ออ้างมีหลักฐานจากสื่อหรือข้อมูลที่ได้รับหรือไม่ ถ้าไม่มีให้ลบออก

ประเภทสื่อ: ${input.sourceType ?? "ไม่ระบุ"}
วันที่งาน: ${input.workDate ?? "ไม่ระบุ"}`;

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") {
    content.push({ type: "input_image", image_url: input.imageUrl, detail: "high" });
  } else if (input.sourceType === "video") {
    content.push({ type: "input_text", text: "รายการนี้เป็นวิดีโอ แต่ระบบยังไม่ได้ส่งภาพหรือเฟรมจากวิดีโอให้โมเดล ห้ามบรรยายว่าในคลิปกำลังทำอะไร ห้ามเดาสถานที่ เวลา อาหาร ลูกค้า หรือขั้นตอนงาน ให้เขียนเพียงข้อความกลางที่ระบุว่าเป็นภาพบรรยากาศ/เบื้องหลังจากการทำงานจริง โดยไม่สร้างข้อเท็จจริงเพิ่ม หากไม่มีข้อเท็จจริงพอให้ใช้ข้อความสั้นมาก" });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      input: [{ role: "user", content }],
      max_output_tokens: 700,
    }),
  });

  const json = (await response.json()) as OpenAIResponse;
  if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);

  let text = typeof json.output_text === "string" ? json.output_text.trim() : "";
  if (!text) {
    for (const item of json.output ?? []) {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && typeof part.text === "string" && part.text.trim()) {
          text = part.text.trim();
          break;
        }
      }
      if (text) break;
    }
  }

  if (!text) {
    const reason = json.incomplete_details?.reason;
    throw new Error(reason ? `AI did not return a caption (${reason})` : `AI did not return a caption (status: ${json.status ?? "unknown"})`);
  }
  return text;
}
