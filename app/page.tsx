import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const brandColors = {
  redPrimary: "#E50914",
  redDark: "#7A0008",
  redDeep: "#120000",
  yellowPrimary: "#FFC107",
  yellowGold: "#FFD54A",
  black: "#0B0B0B",
  charcoal: "#171717",
  white: "#FFFFFF",
  softWhite: "#FFF8F0",
};

const strengths = [
  { icon: "🏪", title: "มีสาขาจริง", text: "ต่อยอดจากร้านขายจริงและโครงสร้างแฟรนไชส์ที่ดูแลได้เป็นระบบ" },
  { icon: "📊", title: "มีระบบหลังบ้าน", text: "บันทึกยอดขาย วัตถุดิบ คงเหลือ และรายการสั่งของผ่านมือถือ" },
  { icon: "🍗", title: "สูตรไก่หมักพร้อมทอด", text: "มีแนวทางเตรียมวัตถุดิบ รสชาติ และมาตรฐานการขายหน้าร้าน" },
  { icon: "🧭", title: "ประเมินก่อนเริ่ม", text: "ทีมงานช่วยดูทำเล งบประมาณ ความพร้อม และรูปแบบร้านที่เหมาะสม" },
];

const fit = [
  "คนอยากเริ่มอาชีพขายอาหาร",
  "คนมีทำเลหน้าโรงเรียน / ตลาด / ชุมชน / โรงงาน",
  "คนพร้อมลงมือทำจริง",
  "คนต้องการระบบ ไม่ใช่แค่ซื้ออุปกรณ์",
];

const notFit = [
  "คนที่มองแค่เทียบราคา",
  "คนไม่พร้อมทำตามระบบ",
  "คนอยากลงทุนอย่างเดียวแต่ไม่ลงมือ",
  "คนคาดหวังกำไรโดยไม่บริหารร้าน",
];

const benefits = [
  "สูตรไก่หมักพร้อมทอด",
  "ระบบการขาย",
  "ระบบหลังบ้าน",
  "แนวทางคำนวณต้นทุน",
  "การสั่งวัตถุดิบ",
  "การดูแลหลังเปิดร้าน",
];

const process = [
  { step: "01", title: "กรอกใบสมัคร", text: "ส่งข้อมูลผู้สมัคร ทำเล งบประมาณ และความพร้อมผ่านระบบกลาง" },
  { step: "02", title: "ทีมงานประเมิน", text: "ตรวจสอบความเหมาะสมและเตรียมคำแนะนำก่อนเริ่มต้น" },
  { step: "03", title: "คุยรูปแบบร้าน", text: "สรุปแพ็กเกจ วัตถุดิบ วิธีขาย และแผนเปิดร้านร่วมกัน" },
  { step: "04", title: "เริ่มขายด้วยระบบ", text: "เปิดร้านพร้อมแนวทางปฏิบัติและเครื่องมือหลังบ้านสำหรับสาขา" },
];

const primaryButton =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-[#FFC107] px-7 py-4 text-base font-black text-[#120000] shadow-2xl shadow-[#ffc107]/25 transition hover:-translate-y-0.5 hover:bg-[#FFD54A] focus-ring sm:text-lg";
const secondaryButton =
  "inline-flex min-h-14 items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-[#120000] focus-ring sm:text-lg";

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
      <p className="text-sm font-black uppercase tracking-[0.24em] text-[#E50914]">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-[#120000] sm:text-4xl">{title}</h2>
      {text ? <p className="mt-4 text-base font-bold leading-8 text-[#5f5353] sm:text-lg">{text}</p> : null}
    </div>
  );
}

function DeviceMockup() {
  return (
    <div className="relative mx-auto max-w-[34rem] lg:mx-0">
      <div className="absolute -left-8 top-10 hidden h-40 w-40 rounded-full bg-[#FFC107]/30 blur-3xl sm:block" />
      <div className="absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-[#E50914]/30 blur-3xl" />
      <div className="relative rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="overflow-hidden rounded-[1.5rem] border border-white/15 bg-[#0B0B0B]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#171717] px-4 py-3">
            <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-[#ff5f57]" /><span className="h-3 w-3 rounded-full bg-[#ffbd2e]" /><span className="h-3 w-3 rounded-full bg-[#28c840]" /></div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/70">Kai-tood Dashboard</div>
          </div>
          <div className="grid gap-4 p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["ยอดขายวันนี้", "฿18,450"],
                ["สาขา", "12"],
                ["ออเดอร์", "148"],
                ["วัตถุดิบ", "พร้อม"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white p-3 text-[#120000] shadow-lg">
                  <p className="text-[11px] font-black text-[#7A0008]/65">{label}</p>
                  <p className="mt-1 text-lg font-black">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white p-4 text-[#120000]">
              <div className="flex items-center justify-between"><p className="font-black">ยอดขายรายสาขา</p><span className="rounded-full bg-[#E50914] px-3 py-1 text-xs font-black text-white">Live</span></div>
              <div className="mt-5 flex h-32 items-end gap-3">
                {[46, 72, 58, 86, 64, 92, 78].map((height, index) => <div key={index} className="flex-1 rounded-t-xl bg-gradient-to-t from-[#7A0008] to-[#E50914]" style={{ height: `${height}%` }} />)}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_0.72fr]">
              <div className="rounded-3xl border border-white/10 bg-white/95 p-4 text-[#120000]">
                <p className="font-black">รายการวัตถุดิบวันพรุ่งนี้</p>
                <div className="mt-3 space-y-2 text-sm font-bold text-[#5f5353]">
                  <div className="flex justify-between"><span>BL</span><span>24 kg</span></div>
                  <div className="flex justify-between"><span>หนังไก่</span><span>18 kg</span></div>
                  <div className="flex justify-between"><span>ข้าวเหนียว</span><span>35 kg</span></div>
                </div>
              </div>
              <div className="rounded-[2rem] border-[8px] border-[#090909] bg-[#FFF8F0] p-3 text-[#120000] shadow-2xl sm:absolute sm:-bottom-7 sm:-right-5 sm:w-40">
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#0B0B0B]/20" />
                <p className="text-xs font-black text-[#E50914]">Mobile Report</p>
                <p className="mt-2 text-2xl font-black">98%</p>
                <p className="text-xs font-bold text-[#5f5353]">ข้อมูลสาขาครบถ้วน</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#FFF8F0] text-[#120000]" style={{ fontFamily: "Prompt, Kanit, 'Noto Sans Thai', Arial, sans-serif" }}>
      <section className="relative overflow-hidden bg-[#120000] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,193,7,0.24),transparent_18rem),radial-gradient(circle_at_82%_8%,rgba(229,9,20,0.72),transparent_27rem),linear-gradient(135deg,#120000_0%,#7A0008_48%,#E50914_100%)]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-20 [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 pb-16 pt-4 sm:px-6 sm:py-8 lg:px-8 lg:pb-24">
          <nav className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-[#0B0B0B]/78 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
              <BrandLogo size={54} priority variant="red" />
              <div className="min-w-0">
                <div className="truncate text-base font-black text-white sm:text-lg">{BRAND_NAME}</div>
                <div className="truncate text-[11px] font-bold text-[#FFD54A] sm:text-xs">{BRAND_SUBTITLE}</div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-2 text-sm font-black sm:flex sm:items-center">
              <Link href="/login" className="rounded-full border border-white/20 px-4 py-3 text-center text-white transition hover:bg-white hover:text-[#120000]">เข้าสู่ระบบสาขา</Link>
              <Link href="/franchise/apply" className="rounded-full bg-[#FFC107] px-4 py-3 text-center text-[#120000] shadow-lg shadow-[#ffc107]/25 transition hover:bg-[#FFD54A]">สมัครแฟรนไชส์</Link>
            </div>
          </nav>

          <div className="grid gap-12 py-2 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-12">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-[#FFD54A] backdrop-blur">แฟรนไชส์อาหารพร้อมระบบบริหารร้านจริง</div>
              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">แฟรนไชส์ข้าวเหนียวไก่ทอด<br /><span className="text-[#FFD54A]">ที่พร้อมให้คุณเริ่มขายแบบมืออาชีพ</span></h1>
              <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-white/82 sm:text-xl">จากร้านข้างทาง สู่ระบบแฟรนไชส์ที่มีสาขาจริง ลูกค้าจริง และเครื่องมือหลังบ้านสำหรับบริหารร้านจริง</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/franchise/apply" className={primaryButton}>สมัครแฟรนไชส์</Link>
                <Link href="#process" className={secondaryButton}>ดูขั้นตอนสมัคร</Link>
              </div>
            </div>
            <DeviceMockup />
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader eyebrow="Brand Strength" title="จุดแข็งของแบรนด์" text="ออกแบบให้คนสนใจแฟรนไชส์เห็นภาพว่าแบรนด์มีระบบ มีทีม และมีแนวทางปฏิบัติจริง" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{strengths.map((item) => <div key={item.title} className="rounded-[24px] border border-[#E50914]/10 bg-white p-6 shadow-xl shadow-[#7A0008]/5"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF2C2] text-2xl">{item.icon}</div><h3 className="mt-5 text-xl font-black">{item.title}</h3><p className="mt-3 text-sm font-bold leading-7 text-[#5f5353]">{item.text}</p></div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[32px] border border-[#E50914]/10 bg-white p-6 shadow-xl shadow-[#7A0008]/5 sm:p-8"><h2 className="text-3xl font-black">เหมาะกับใคร</h2><ul className="mt-6 space-y-4">{fit.map((x) => <li key={x} className="flex gap-3 text-base font-bold leading-7"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E50914] text-sm text-white">✓</span>{x}</li>)}</ul></div>
          <div className="rounded-[32px] border border-[#FFC107]/35 bg-[#fff4d1] p-6 shadow-xl shadow-[#7A0008]/5 sm:p-8"><h2 className="text-3xl font-black">ไม่เหมาะกับใคร</h2><ul className="mt-6 space-y-4">{notFit.map((x) => <li key={x} className="flex gap-3 text-base font-bold leading-7 text-[#4d3333]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#120000] text-sm text-[#FFD54A]">!</span>{x}</li>)}</ul></div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader eyebrow="Franchise Benefits" title="สิ่งที่แฟรนไชส์ได้รับ" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item, index) => <div key={item} className="rounded-[24px] border border-white/10 bg-[#171717] p-6 text-white shadow-2xl shadow-black/10"><div className="text-sm font-black text-[#FFD54A]">0{index + 1}</div><h3 className="mt-4 text-xl font-black">{item}</h3><div className="mt-5 h-1.5 rounded-full bg-gradient-to-r from-[#E50914] to-[#FFC107]" /></div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0B0B0B_0%,#120000_52%,#7A0008_100%)] p-7 text-white shadow-2xl shadow-black/20 sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#E50914]/30 blur-3xl" />
          <p className="relative text-sm font-black uppercase tracking-[0.24em] text-[#FFD54A]">Founder Story</p>
          <h2 className="relative mt-3 text-4xl font-black">คมน์ ม่วงคำ</h2>
          <p className="relative mt-5 max-w-4xl text-lg font-bold leading-9 text-white/82">อดีตข้าราชการ 27 ปี เริ่มธุรกิจข้าวเหนียวไก่ทอดจากทุน 4,000 บาท และสร้างแบรนด์จากประสบการณ์ร้านอาหารข้างทางจริง</p>
        </div>
      </Section>

      <Section id="process" className="pt-0">
        <SectionHeader eyebrow="Apply Process" title="ขั้นตอนสมัครแฟรนไชส์" />
        <div className="grid gap-4 lg:grid-cols-4">{process.map((item) => <div key={item.step} className="rounded-[24px] border border-[#E50914]/10 bg-white p-6 shadow-xl shadow-[#7A0008]/5"><div className="text-sm font-black text-[#E50914]">STEP {item.step}</div><h3 className="mt-3 text-xl font-black">{item.title}</h3><p className="mt-3 text-sm font-bold leading-7 text-[#5f5353]">{item.text}</p></div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[36px] bg-[linear-gradient(135deg,#E50914_0%,#7A0008_54%,#0B0B0B_100%)] p-8 text-center text-white shadow-2xl shadow-[#7A0008]/25 sm:p-12">
          <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">สนใจเริ่มต้นแฟรนไชส์กับแบรนด์ที่มีระบบจริง</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-bold leading-8 text-white/82 sm:text-lg">สมัครผ่านระบบของแบรนด์ เพื่อให้ทีมงานประเมินทำเล งบประมาณ และความพร้อมก่อนติดต่อกลับ</p>
          <Link href="/franchise/apply" className={`${primaryButton} mt-7`}>สมัครแฟรนไชส์วันนี้</Link>
        </div>
      </Section>
      <div className="hidden" aria-hidden="true">{Object.values(brandColors).join(" ")}</div>
    </main>
  );
}
