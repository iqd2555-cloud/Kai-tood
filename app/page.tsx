import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const trustSignals = [
  { value: "ระบบแบรนด์", label: "สมัครผ่านระบบกลางและส่งเข้าทีมประเมินโดยตรง" },
  { value: "หลังบ้านจริง", label: "มีระบบสำหรับยอดขาย วัตถุดิบ คงเหลือ และออเดอร์" },
  { value: "สาขาจริง", label: "โครงสร้างรองรับหลายสาขาและการดูแลหลังเปิดร้าน" },
  { value: "ทีมงานดูแล", label: "ประเมินทำเล งบประมาณ และความพร้อมก่อนเริ่ม" },
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

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#fffdf5] text-[#111111]">
      <section className="relative overflow-hidden bg-[#111111] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,196,0,0.34),transparent_18rem),radial-gradient(circle_at_90%_18%,rgba(255,255,255,0.12),transparent_22rem)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#fffdf5] to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-5 sm:py-16">
          <nav className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 rounded-2xl focus-ring">
              <BrandLogo size={52} priority />
              <div>
                <div className="text-base font-black text-[#ffc400] sm:text-lg">{BRAND_NAME}</div>
                <div className="text-[11px] font-bold text-white/75 sm:text-xs">{BRAND_SUBTITLE}</div>
              </div>
            </Link>
            <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-white/15">เข้าสู่ระบบสาขา</Link>
          </nav>

          <div className="grid gap-8 py-4 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:py-10">
            <div>
              <p className="inline-flex rounded-full border border-[#ffc400]/40 bg-[#ffc400]/15 px-4 py-2 text-sm font-black text-[#ffc400]">เปิดรับผู้สนใจแฟรนไชส์แบบมีระบบ</p>
              <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">แฟรนไชส์ข้าวเหนียวไก่ทอด ที่พร้อมให้คุณเริ่มขายแบบมืออาชีพ</h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/80">ไม่ใช่แค่ซื้อสูตรหรืออุปกรณ์ แต่เป็นการสมัครเข้าระบบแบรนด์ที่มีสาขาจริง กระบวนการประเมินจริง และเครื่องมือหลังบ้านสำหรับบริหารร้านจริง</p>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/8 p-4 text-sm font-bold leading-7 text-white/82 backdrop-blur sm:max-w-2xl">
                สมัครผ่านระบบของแบรนด์โดยตรง ข้อมูลจะถูกส่งเข้าระบบเพื่อให้ทีมงานประเมินทำเล งบประมาณ และความพร้อมก่อนติดต่อกลับ
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/franchise/apply" className="rounded-full bg-[#ffc400] px-6 py-4 text-center text-lg font-black text-black shadow-lg shadow-[#ffc400]/20 transition hover:-translate-y-0.5">สมัครแฟรนไชส์</Link>
                <Link href="#process" className="rounded-full bg-white px-6 py-4 text-center text-lg font-black text-black transition hover:-translate-y-0.5">ดูขั้นตอนสมัคร</Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-4 shadow-2xl backdrop-blur sm:p-5">
              <div className="rounded-[1.5rem] bg-[#fffdf5] p-5 text-black shadow-inner sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <BrandLogo size={86} className="shrink-0" />
                  <div className="text-right"><p className="text-xs font-black text-black/50">FRANCHISE SYSTEM</p><h2 className="text-2xl font-black">พร้อมเปิดร้าน</h2></div>
                </div>
                <div className="mt-6 grid gap-3">
                  {trustSignals.slice(0, 3).map((item) => <div key={item.value} className="rounded-2xl border border-black/10 bg-white p-4"><div className="font-black">{item.value}</div><div className="mt-1 text-sm font-bold text-black/62">{item.label}</div></div>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustSignals.map((item) => <div key={item.value} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"><div className="text-xl font-black">{item.value}</div><p className="mt-2 text-sm font-bold leading-6 text-black/65">{item.label}</p></div>)}
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[2rem] bg-[#111111] p-6 text-white sm:p-8">
          <p className="text-sm font-black text-[#ffc400]">Founder Story</p>
          <h2 className="mt-2 text-3xl font-black">คมน์ ม่วงคำ</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">อดีตข้าราชการ 27 ปี เริ่มธุรกิจข้าวเหนียวไก่ทอดจากทุน 4,000 บาท และสร้างแบรนด์จากประสบการณ์ร้านอาหารข้างทางจริง</p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="mb-6"><p className="text-sm font-black uppercase tracking-[0.2em] text-[#b38600]">Proof Section</p><h2 className="mt-2 text-3xl font-black">หลักฐานความน่าเชื่อถือของแบรนด์</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{proofPoints.map((item) => <div key={item} className="rounded-3xl border border-black/10 bg-white p-5 font-black shadow-sm">✓ {item}</div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">เหมาะกับ</h2><ul className="mt-4 space-y-3">{fit.map((x) => <li key={x} className="font-bold">✓ {x}</li>)}</ul></div>
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">ไม่เหมาะกับ</h2><ul className="mt-4 space-y-3">{notFit.map((x) => <li key={x} className="font-bold text-black/70">• {x}</li>)}</ul></div>
        </div>
      </Section>

      <Section className="pt-0">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#b38600]">Franchise Package</p>
        <h2 className="mt-2 text-3xl font-black">สิ่งที่แฟรนไชส์ได้รับ</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item) => <div key={item.title} className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffc400] text-2xl">{item.icon}</div><h3 className="mt-4 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm font-bold leading-6 text-black/62">{item.text}</p></div>)}</div>
      </Section>

      <Section id="process" className="pt-0">
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#b38600]">Process Section</p>
          <h2 className="mt-2 text-3xl font-black">ขั้นตอนการสมัครแฟรนไชส์</h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-4">{process.map((item) => <div key={item.step} className="rounded-3xl bg-[#fff8da] p-5"><div className="text-sm font-black text-[#8a6900]">STEP {item.step}</div><h3 className="mt-2 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm font-bold leading-6 text-black/65">{item.text}</p></div>)}</div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[2rem] bg-[#111111] p-7 text-center text-white sm:p-10">
          <h2 className="text-3xl font-black">สมัครแฟรนไชส์ผ่านระบบแบรนด์โดยตรง</h2>
          <p className="mx-auto mt-3 max-w-2xl font-bold leading-7 text-white/75">ข้อมูลของคุณจะถูกส่งเข้าระบบเพื่อให้ทีมงานประเมินและติดต่อกลับ พร้อมช่วยดูทำเล งบประมาณ และความพร้อมก่อนเริ่มเปิดร้าน</p>
          <Link href="/franchise/apply" className="mt-6 inline-flex rounded-full bg-[#ffc400] px-7 py-4 text-lg font-black text-black">สมัครแฟรนไชส์</Link>
        </div>
      </Section>
    </main>
  );
}
