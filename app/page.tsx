import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";


const trustSignals = [
  { icon: "▣", value: "ระบบแบรนด์", label: "สมัครผ่านระบบกลาง และส่งเข้าทีมประเมินโดยตรง" },
  { icon: "▥", value: "หลังบ้านจริง", label: "มีระบบสำหรับยอดขาย วัตถุดิบ คงเหลือ และออเดอร์" },
  { icon: "●", value: "สาขาจริง", label: "โครงสร้างรองรับหลายสาขาและการดูแลหลังเปิดร้าน" },
  { icon: "✓", value: "ทีมงานดูแล", label: "ประเมินทำเล งบประมาณ และความพร้อมก่อนเริ่ม" },
];

const proofPoints = [
  "มีผู้ติดตามบน TikTok / Facebook จำนวนมาก",
  "มีผู้เรียนและผู้เปิดร้านจริง",
  "มีสาขาจริงและการขายหน้าร้านจริง",
  "มีระบบหลังบ้านช่วยบริหารสาขา",
];

const fit = [
  "คนอยากเริ่มอาชีพขายอาหาร",
  "คนมีทำเลหน้าชุมชน โรงเรียน ตลาด โรงงาน",
  "คนพร้อมลงมือทำจริง",
  "คนต้องการระบบและแนวทาง ไม่ใช่แค่ซื้ออุปกรณ์",
];

const notFit = [
  "คนที่อยากลงทุนอย่างเดียวแต่ไม่ลงมือ",
  "คนที่มองแฟรนไชส์แค่เทียบราคา",
  "คนที่ไม่พร้อมทำตามระบบ",
];

const benefits = [
  { icon: "🍗", title: "สูตรไก่หมักพร้อมทอด", text: "แนวทางการเตรียมวัตถุดิบและรสชาติหลักของแบรนด์" },
  { icon: "📋", title: "ระบบการขาย", text: "โครงสร้างการเปิดร้าน การรับออเดอร์ และการทำงานหน้าร้าน" },
  { icon: "📱", title: "ระบบหลังบ้าน", text: "บันทึกยอดขาย วัตถุดิบ คงเหลือ และรายการสั่งของผ่านมือถือ" },
  { icon: "💰", title: "แนวทางคำนวณต้นทุน", text: "ช่วยให้เข้าใจต้นทุนต่อวันและการวางแผนกำไรของร้าน" },
  { icon: "📦", title: "การสั่งวัตถุดิบ", text: "มีแนวทางจัดการวัตถุดิบที่ต้องใช้และสิ่งที่ต้องเตรียมวันถัดไป" },
  { icon: "🤝", title: "การดูแลหลังเปิดร้าน", text: "ทีมงานติดตาม ประเมิน และช่วยแนะนำการทำร้านตามระบบ" },
];

const process = [
  { step: "01", title: "กรอกใบสมัคร", text: "ส่งข้อมูลผู้สมัคร ทำเล งบประมาณ และความพร้อมผ่านระบบของแบรนด์" },
  { step: "02", title: "ทีมงานประเมิน", text: "ข้อมูลจะถูกส่งเข้าระบบเพื่อให้ทีมงานตรวจสอบและประเมินความเหมาะสม" },
  { step: "03", title: "พูดคุยรายละเอียด", text: "สรุปรูปแบบร้าน การลงทุน วัตถุดิบ และวิธีเริ่มต้นร่วมกัน" },
  { step: "04", title: "เตรียมเปิดร้าน", text: "รับแนวทางการทำงานและเริ่มใช้ระบบบริหารสาขาตามมาตรฐานแบรนด์" },
];

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`mx-auto max-w-6xl px-4 py-10 sm:py-14 ${className}`}>{children}</section>;
}

const primaryButton = "rounded-full bg-[#E60012] px-6 py-4 text-center text-base font-black text-white shadow-lg shadow-[#E60012]/25 transition hover:-translate-y-0.5 hover:bg-[#b9000e] sm:text-lg";
const secondaryButton = "rounded-full border border-[#111111] bg-white px-6 py-4 text-center text-base font-black text-[#111111] transition hover:-translate-y-0.5 hover:border-[#E60012] hover:text-[#E60012] sm:text-lg";

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-white text-[#111111]">
      <section className="relative overflow-hidden bg-[#111111] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(230,0,18,0.52),transparent_21rem),radial-gradient(circle_at_88%_12%,rgba(122,0,8,0.72),transparent_24rem),linear-gradient(135deg,#111111_0%,#220003_48%,#7A0008_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-7 px-4 pb-16 pt-4 sm:py-14">
          <nav className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white px-4 py-3 text-[#111111] shadow-2xl shadow-black/25 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
              <BrandLogo size={54} priority variant="red" />
              <div className="min-w-0">
                <div className="truncate text-base font-black text-[#111111] sm:text-lg">{BRAND_NAME}</div>
                <div className="truncate text-[11px] font-bold text-[#E60012] sm:text-xs">{BRAND_SUBTITLE}</div>
              </div>
            </Link>
            <div className="grid grid-cols-1 gap-2 text-sm font-black sm:flex sm:items-center">
              <Link href="/franchise/apply" className="rounded-full bg-[#E60012] px-4 py-3 text-center text-white transition hover:bg-[#b9000e]">สมัครแฟรนไชส์</Link>
              <Link href="#process" className="rounded-full border border-[#E60012] bg-white px-4 py-3 text-center text-[#E60012] transition hover:bg-[#fff0f1]">ดูขั้นตอนสมัคร</Link>
              <Link href="/login" className="rounded-full border border-[#111111] bg-white px-4 py-3 text-center text-[#111111] transition hover:bg-[#111111] hover:text-white">เข้าสู่ระบบสาขา</Link>
            </div>
          </nav>

          <div className="grid gap-8 py-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-10">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-[#E60012] px-4 py-2 text-sm font-black text-white shadow-lg shadow-[#E60012]/25">เปิดรับผู้สนใจแฟรนไชส์</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-6xl">แฟรนไชส์ข้าวเหนียวไก่ทอด ที่พร้อมให้คุณเริ่มขายแบบมืออาชีพ</h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/82">ไม่ใช่แค่ซื้อสูตรหรืออุปกรณ์ แต่เป็นการสมัครเข้าสู่ระบบแบรนด์ที่มีสาขาจริง กระบวนการประเมินจริง และเครื่องมือหลังบ้านสำหรับบริหารร้านจริง</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/franchise/apply" className={primaryButton}>สมัครแฟรนไชส์</Link>
                <Link href="#process" className={secondaryButton}>ดูขั้นตอนสมัคร</Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-5">
              <div className="relative min-h-[23rem] overflow-hidden rounded-[1.5rem] bg-[#111111] shadow-inner">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(17,17,17,0.1),rgba(122,0,8,0.38)),url('/images/fried-chicken-hero.jpg')] bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                <div className="relative flex min-h-[23rem] flex-col justify-end p-5 sm:p-7">
                  <div className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black text-[#E60012]">FRANCHISE BUSINESS</div>
                  <h2 className="mt-4 text-3xl font-black text-white">พร้อมเปิดร้านด้วยระบบแบรนด์</h2>
                  <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-white/78">หากยังไม่มีรูป ระบบจะแสดงเป็นการ์ดไล่สีแดง-ดำ และพร้อมแสดงรูปทันทีเมื่ออัปโหลดไฟล์</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="mb-6 max-w-2xl"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#E60012]">Franchise System</p><h2 className="mt-2 text-3xl font-black">ระบบแฟรนไชส์ที่ออกแบบจากร้านจริง</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustSignals.map((item) => <div key={item.value} className="rounded-3xl border border-[#e8e8e8] bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f1] text-xl font-black text-[#E60012]">{item.icon}</div><div className="mt-4 text-xl font-black text-[#111111]">{item.value}</div><p className="mt-2 text-sm font-bold leading-6 text-[#666666]">{item.label}</p></div>)}
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#111111_0%,#250003_55%,#7A0008_100%)] p-6 text-white shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-sm font-black text-[#E60012]">Founder Story</p>
          <h2 className="mt-2 text-3xl font-black">คมน์ ม่วงคำ</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/82">อดีตข้าราชการ 27 ปี เริ่มธุรกิจจากทุน 4,000 บาท สร้างแบรนด์จากร้านอาหารข้างทางจริง จนพัฒนาเป็นระบบที่มีหลังบ้านและรองรับหลายสาขาจริง</p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="mb-6"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#E60012]">Proof Section</p><h2 className="mt-2 text-3xl font-black">หลักฐานความน่าเชื่อถือของแบรนด์</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{proofPoints.map((item) => <div key={item} className="rounded-3xl border border-[#e8e8e8] bg-white p-5 font-black shadow-sm"><span className="text-[#E60012]">✓</span> {item}</div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-[#e8e8e8] bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">เหมาะกับ</h2><ul className="mt-4 space-y-3">{fit.map((x) => <li key={x} className="font-bold"><span className="text-[#E60012]">✓</span> {x}</li>)}</ul></div>
          <div className="rounded-[2rem] border border-[#e8e8e8] bg-[#F3F3F3] p-6 shadow-sm"><h2 className="text-2xl font-black">ไม่เหมาะกับ</h2><ul className="mt-4 space-y-3">{notFit.map((x) => <li key={x} className="font-bold text-black/70">• {x}</li>)}</ul></div>
        </div>
      </Section>

      <Section className="pt-0">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#E60012]">Franchise Package</p>
        <h2 className="mt-2 text-3xl font-black">สิ่งที่แฟรนไชส์ได้รับ</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item) => <div key={item.title} className="rounded-3xl border border-[#e8e8e8] bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0f1] text-2xl text-[#E60012]">{item.icon}</div><h3 className="mt-4 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm font-bold leading-6 text-[#666666]">{item.text}</p></div>)}</div>
      </Section>

      <Section id="process" className="pt-0">
        <div className="rounded-[2rem] border border-[#e8e8e8] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#E60012]">Process Section</p>
          <h2 className="mt-2 text-3xl font-black">ขั้นตอนการสมัครแฟรนไชส์</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">{process.map((item) => <div key={item.step} className="rounded-3xl border border-[#e8e8e8] bg-[#F3F3F3] p-5"><div className="text-sm font-black text-[#E60012]">STEP {item.step}</div><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm font-bold leading-6 text-[#666666]">{item.text}</p></div>)}</div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[2rem] bg-[linear-gradient(135deg,#111111_0%,#250003_52%,#7A0008_100%)] p-7 text-center text-white shadow-2xl shadow-black/20 sm:p-10">
          <h2 className="text-3xl font-black">พร้อมเริ่มต้นกับระบบแฟรนไชส์ที่มีร้านจริงและหลังบ้านจริง</h2>
          <p className="mx-auto mt-3 max-w-2xl font-bold leading-7 text-white/78">สมัครผ่านระบบของแบรนด์ เพื่อให้ทีมงานประเมินทำเล งบประมาณ และความพร้อมก่อนติดต่อกลับ</p>
          <Link href="/franchise/apply" className="mt-6 inline-flex rounded-full bg-[#E60012] px-7 py-4 text-lg font-black text-white shadow-lg shadow-[#E60012]/25 transition hover:bg-[#b9000e]">สมัครแฟรนไชส์</Link>
        </div>
      </Section>
    </main>
  );
}
