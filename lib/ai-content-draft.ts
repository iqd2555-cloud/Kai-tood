import { generateContentCaption } from "@/lib/ai-caption";

type DraftInput = { imageUrl?: string | null; sourceType?: string | null; workDate?: string | null };
type OpenAIResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
export type ContentDraft = { caption: string; quote: string };
function extractText(json: OpenAIResponse) { if (json.output_text?.trim()) return json.output_text.trim(); for (const item of json.output ?? []) for (const part of item.content ?? []) if (part.type === "output_text" && part.text?.trim()) return part.text.trim(); return ""; }

export async function generateContentDraft(input: DraftInput): Promise<ContentDraft> {
  // ล็อกน้ำเสียงบทความให้ใช้มาตรฐานเดียวกับ Caption ที่เจ้าของอนุมัติแล้ว
  const caption = await generateContentCaption(input);
  const apiKey = process.env.OPENAI_API_KEY; if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const prompt = `สร้างคำคมภาษาไทยสั้นสำหรับวางบนรูปของแบรนด์ “เหนียวไก่เยอะโคตร” จากภาพจริงนี้\n- ไม่เกิน 15 คำ\n- 1 ประเด็นเท่านั้น\n- เป็นภาษาคนจริง มีความรู้สึก แต่ไม่เว่อร์\n- สัมพันธ์กับโมเมนต์ในภาพและสอดคล้องกับข้อความโพสต์ด้านล่าง\n- ห้ามแต่งยอดขาย ลูกค้า กำไร ออเดอร์ รสชาติ หรือผลลัพธ์ที่ภาพไม่ได้ยืนยัน\n- ห้ามเป็นคำคมลอยๆ\nตอบเฉพาะคำคม ไม่ใส่เครื่องหมายคำพูด ไม่ใส่หัวข้อ\n\nข้อความโพสต์:\n${caption}\nวันที่งาน: ${input.workDate ?? "ไม่ระบุ"}`;
  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (input.imageUrl && input.sourceType !== "video") content.push({ type: "input_image", image_url: input.imageUrl, detail: "high" });
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-5-mini", reasoning: { effort: "minimal" }, input: [{ role: "user", content }], max_output_tokens: 160 }) });
  const json = (await response.json()) as OpenAIResponse; if (!response.ok) throw new Error(json.error?.message ?? `OpenAI API error ${response.status}`);
  const quote = extractText(json).replace(/^['“"]|['”"]$/g, "").trim(); if (!quote) throw new Error("AI did not return quote");
  const words = quote.split(/\s+/).filter(Boolean); if (words.length > 15) throw new Error("AI quote exceeds 15 words");
  return { caption, quote };
}
