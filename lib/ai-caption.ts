type CaptionInput = {
  imageUrl?: string | null;
  imageUrls?: string[];
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

function readOutput(json: OpenAIResponse) {
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
  return text;
}

async function askOpenAI(apiKey: string, content: Array<Record<string, unknown>>) {
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
  const text = readOutput(json);
  if (!text) {
    const reason = json.incomplete_details?.reason;
    throw new Error(reason ? `AI did not return text (${reason})` : `AI did not return text (status: ${json.status ?? "unknown"})`);
  }
  return text;
}

const brandRules = `คุณเป็นผู้ช่วยเขียนคอนเทนต์ภาษาไทยให้แบรนด์ร้านข้าวเหนียวไก่ทอด “เหนียวไก่เยอะโคตร”
เป้าหมายคือความน่าเชื่อถือจากงานจริง ไม่ใช่ความหวือหวา

กฎข้อเท็จจริง — ต้องทำตามเคร่งครัด:
- ใช้เฉพาะสิ่งที่มองเห็นหรือข้อมูลที่ระบบยืนยันให้เท่านั้น
- ห้ามแต่งหรืออนุมานยอดขาย จำนวนลูกค้า ความยาวคิว กำไร รายได้ ผลลัพธ์ จำนวนสาขา จำนวนออเดอร์ ปริมาณอาหาร หรือความสำเร็จ
- ห้ามอ้างว่า ขายดี ลูกค้าแน่น คิวยาว ของหมด ลูกค้าประจำ ลูกค้าชอบ สดใหม่ กรอบ หอม อร่อย ร้อนๆ ทำทุกวัน เตรียมพร้อมก่อนเปิดร้าน หรือข้อความทำนองเดียวกัน ถ้าหลักฐานไม่ได้ยืนยัน
- ห้ามเดาเวลา เช่น เช้านี้ วันนี้ ก่อนเปิดร้าน ช่วงเร่งด่วน ถ้าไม่มีข้อมูลยืนยัน
- ห้ามเดาความตั้งใจ ความรู้สึก คุณภาพ รสชาติ หรือผลลัพธ์
- คนหลายคนในภาพไม่ได้แปลว่าคิวยาวหรือขายดี
- ถ้าหลักฐานไม่พอ ให้เขียนให้น้อยลง ห้ามเติมเรื่องเพื่อให้โพสต์ดูดี

สไตล์:
- ภาษาไทยง่าย เหมือนเจ้าของร้านเล่าจากงานจริง ไม่ใช่ภาษานักโฆษณาหรือภาษา AI
- 1–3 ประโยค ไม่เกินประมาณ 60 คำ สั้น กระชับ เป็นธรรมชาติ
- ไม่ต้องพยายามขายทุกโพสต์ ไม่ต้องใส่แฮชแท็ก
- เลือกเพียงหนึ่งมุมที่เด่นที่สุดจากหลักฐาน เช่น ขั้นตอนทำงาน อาหาร การห่อ การทอด การนึ่ง การบริการ บรรยากาศหน้าร้าน หรือเบื้องหลังจริง
- บรรยายอาหารได้เฉพาะสิ่งที่เห็น ห้ามตัดสินรสชาติ กลิ่น ความกรอบ หรือความสด`;

export async function generateContentCaption(input: CaptionInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const images = [...(input.imageUrls ?? []), ...(input.imageUrl ? [input.imageUrl] : [])].filter(Boolean).slice(0, 4);
  if (input.sourceType === "video" && images.length < 2) {
    throw new Error("VIDEO_FRAMES_REQUIRED");
  }

  const mediaNote = input.sourceType === "video"
    ? "ภาพที่แนบคือเฟรมจากวิดีโอเดียวกัน เรียงตามเวลา ต้นคลิป → กลางคลิป → ท้ายคลิป ให้สรุปเฉพาะสิ่งที่เฟรมเหล่านี้ยืนยันร่วมกัน ห้ามสมมติสิ่งที่เกิดขึ้นระหว่างเฟรม"
    : "ภาพที่แนบคือสื่อจริงของรายการนี้";

  const draftContent: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: `${brandRules}\n\n${mediaNote}\nประเภทสื่อ: ${input.sourceType ?? "ไม่ระบุ"}\nวันที่งาน: ${input.workDate ?? "ไม่ระบุ"}\n\nเขียนแคปชันจากหลักฐานที่เห็นเท่านั้น`,
  }];
  for (const image of images) draftContent.push({ type: "input_image", image_url: image, detail: "high" });

  const draft = await askOpenAI(apiKey, draftContent);

  const verifyContent: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: `${brandRules}\n\nคุณเป็นด่านตรวจข้อเท็จจริงรอบสุดท้ายก่อนโพสต์\nนี่คือร่างแคปชัน:\n“${draft}”\n\nตรวจทุกข้ออ้างกับภาพ/เฟรมที่แนบทีละข้อในใจ แล้วส่งกลับเฉพาะแคปชันฉบับสุดท้ายเท่านั้น\n- ลบหรือแก้ทุกข้อความที่ภาพ/เฟรมยืนยันไม่ได้\n- ห้ามเพิ่มข้อเท็จจริงใหม่\n- ถ้าร่างเดิมปลอดภัยอยู่แล้ว ให้คงสาระเดิมและทำภาษาให้เป็นธรรมชาติ\n- ถ้าหลักฐานน้อย ให้ย่อให้สั้นลงได้`,
  }];
  for (const image of images) verifyContent.push({ type: "input_image", image_url: image, detail: "high" });

  return askOpenAI(apiKey, verifyContent);
}
