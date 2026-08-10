type DraftInput = { imageUrl?: string | null; sourceType?: string | null; workDate?: string | null };
type OpenAIResponse = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; error?: { message?: string } };
export type ContentDraft = { caption: string; quote: string };
function extractText(json: OpenAIResponse){if(json.output_text?.trim())return json.output_text.trim();for(const item of json.output??[])for(const part of item.content??[])if(part.type==="output_text"&&part.text?.trim())return part.text.trim();return ""}
function cleanJsonText(text:string){return text.replace(/^```json\s*/i,"").replace(/```$/i,"").trim()}
export async function generateContentDraft(input:DraftInput):Promise<ContentDraft>{const apiKey=process.env.OPENAI_API_KEY;if(!apiKey)throw new Error("OPENAI_API_KEY is not configured");
const prompt=`คุณเป็นนักเขียนคอนเทนต์ภาษาไทยสำหรับเพจพ่อค้าแม่ค้าข้างถนนและธุรกิจอาหารจริง

หน้าที่: มองภาพจริง หา "ความหมายของงาน" ที่ภาพนั้นสื่อ แล้วเขียนบทความและคำคมที่อยู่บนแก่นเดียวกัน ห้ามเริ่มจากการคิดคำคมสวยๆ แล้วค่อยพยายามโยงกลับเข้าภาพ

ลำดับคิดที่บังคับ:
1. ระบุในใจว่าภาพนี้กำลังเกิดกิจกรรมอะไร เช่น นึ่งข้าว ทอด เตรียมของ ลูกค้ารอ เก็บร้าน
2. เลือกบทเรียนอาชีพเพียง ONE CORE IDEA ที่สัมพันธ์โดยตรงกับกิจกรรมนั้น เช่น ลงมือทำซ้ำ ความขยัน ความอดทน การเตรียมของ การรักษาจังหวะงาน การเริ่มเช้า
3. เขียนบทความจาก core idea นั้น
4. เขียนคำคมเป็นประโยคสรุป core idea เดียวกัน
5. ตรวจย้อนกลับ: ถ้าเอาภาพออกแล้วคำคมสามารถใช้กับภาพธุรกิจอะไรก็ได้ ให้ถือว่า "ไม่ผ่าน" และเขียนใหม่

กฎคำคมสำคัญมาก:
- ต้องเป็นแรงบันดาลใจสำหรับพ่อค้าแม่ค้าข้างถนน แต่ต้องเกิดจากสิ่งที่ภาพรองรับ
- 7–15 คำโดยประมาณ ประโยคเดียว ภาษาคนจริง จำง่าย
- ห้ามสร้างเหตุและผลที่ภาพพิสูจน์ไม่ได้ เช่น "ร้านอยู่ได้นานเพราะ...", "ลูกค้ากลับมาเพราะ...", "ขายดีเพราะ...", "ความสำเร็จเกิดจาก..." เว้นแต่ระบบมีข้อเท็จจริงนั้นให้
- ห้ามใช้คำกว้างลอยๆ เช่น ความสำเร็จ โชค วันดี ไปได้ไกล ถ้าไม่ได้เชื่อมกับกิจกรรมในภาพอย่างชัดเจน
- ภาพหวดนึ่งข้าว/ไอน้ำ: ควรไปทาง ตื่นเช้า ลงมือ เตรียมของ งานที่ต้องทำซ้ำ ความเหนื่อยของคนขายของ ไม่ควรสรุปว่าร้านอยู่ได้นาน
- ภาพกระทะทอด: ควรไปทาง ยืนหน้าเตา ทำซ้ำ อดทน รักษาจังหวะงาน
- ภาพลูกค้ารอ: ควรไปทาง รีบทำงาน จัดการเวลา ไม่ให้คนรอนาน โดยห้ามแต่งจำนวนหรือผลลัพธ์

ตัวอย่าง "ผ่าน" สำหรับภาพนึ่งข้าว:
"ทุกเช้าที่ลุกมานึ่งข้าว คืออีกวันที่เราไม่ยอมแพ้กับอาชีพนี้"
"คนขายของไม่ได้เริ่มตอนลูกค้ามา เราเริ่มตั้งแต่ตอนที่คนอื่นยังไม่ตื่น"
"เหนื่อยได้ทุกเช้า แต่อย่าหยุดทำมาหากินเพื่อชีวิตที่เราอยากมี"
ตัวอย่าง "ไม่ผ่าน":
"ร้านอยู่ได้นาน ไม่ใช่เพราะวันดี แต่เพราะเตรียมพร้อมทุกวัน" เพราะภาพไม่ได้พิสูจน์ว่าร้านอยู่ได้นาน และคำว่า “วันดี” ไม่มีความหมายชัดกับภาพ

บทความ:
- 120–220 คำ 3–5 ย่อหน้าสั้น
- เปิดจากโมเมนต์จริงเพียงจุดเดียวในภาพ แล้วขยายเป็นบทเรียนของคนทำมาหากิน
- ภาษาพูดธรรมชาติ มีความรู้สึกของคนทำงาน แต่ไม่ดราม่า ไม่โฆษณา ไม่บรรยายสิ่งของทุกชิ้น
- ห้ามแต่งยอดขาย ลูกค้า กำไร คิว ผลลัพธ์ รสชาติ หรือเหตุการณ์ที่ภาพยืนยันไม่ได้
- จบด้วยมุมคิดที่สอดคล้องกับ core idea เดิม

ตอบ JSON เท่านั้น {"article":"...","quote":"..."}
ประเภทสื่อ: ${input.sourceType??"ไม่ระบุ"}
วันที่งาน: ${input.workDate??"ไม่ระบุ"}`;
const content:Array<Record<string,unknown>>=[{type:"input_text",text:prompt}];if(input.imageUrl&&input.sourceType!=="video")content.push({type:"input_image",image_url:input.imageUrl,detail:"high"});const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:"gpt-5-mini",reasoning:{effort:"minimal"},input:[{role:"user",content}],max_output_tokens:1500})});const json=(await response.json())as OpenAIResponse;if(!response.ok)throw new Error(json.error?.message??`OpenAI API error ${response.status}`);const text=extractText(json);if(!text)throw new Error("AI did not return content");const parsed=JSON.parse(cleanJsonText(text))as{article?:string;caption?:string;quote?:string};const caption=String(parsed.article??parsed.caption??"").trim(),quote=String(parsed.quote??"").replace(/^['“"]|['”"]$/g,"").trim();if(!caption||!quote)throw new Error("AI response missing article or quote");if(quote.split(/\s+/).filter(Boolean).length>15)throw new Error("AI quote exceeds 15 words");return{caption,quote}}
