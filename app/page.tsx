import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const proofCards = [
  { title: "ร้านจริง", text: "เริ่มจากร้านที่ขายอาหารจริงทุกวัน เห็นปัญหาและโอกาสจากหน้าร้านโดยตรง" },
  { title: "ลูกค้าจริง", text: "เข้าใจพฤติกรรมลูกค้าหน้างาน เมนูหลัก ช่วงเวลาขาย และการจัดการคิว" },
  { title: "ระบบจริง", text: "มีระบบหลังบ้านสำหรับยอดขาย วัตถุดิบ คงเหลือ และรายการสั่งของของแต่ละสาขา" },
  { title: "ทีมงานดูแลจริง", text: "ประเมินผู้สมัคร ทำเล งบลงทุน และความพร้อมก่อนเริ่มเปิดร้านอย่างเป็นขั้นตอน" },
];

const badges = ["มีสาขาจริง", "มีระบบหลังบ้าน", "คุมมาตรฐานวัตถุดิบ", "เหมาะกับมือถือ"];
const stats = [
  { value: "2", label: "รูปแบบลงทุน", detail: "เคาน์เตอร์ / ซุ้ม" },
  { value: "55K", label: "เริ่มต้น", detail: "รูปแบบเคาน์เตอร์" },
  { value: "Real-time", label: "ระบบหลังบ้าน", detail: "ยอดขายและวัตถุดิบ" },
];
const fit = ["อยากเริ่มธุรกิจอาหารที่จับต้องได้", "มีทำเลหรือกำลังหาทำเลจริง", "พร้อมลงมือดูแลร้านและทีมงาน", "ต้องการระบบช่วยคุมต้นทุนและวัตถุดิบ"];
const notFit = ["ต้องการลงทุนแล้วรอรับกำไรทันที", "ไม่พร้อมทำตามมาตรฐานร้าน", "ไม่มีเวลาติดตามงานหน้าร้าน", "มองแฟรนไชส์เป็นแค่ชุดอุปกรณ์ราคาถูก"];
const benefits = ["สูตรไก่หมักพร้อมทอด", "ระบบการขายหน้าร้าน", "การคำนวณต้นทุน", "ระบบสั่งวัตถุดิบ", "ระบบหลังบ้าน", "การดูแลหลังเปิดร้าน"];
const steps = [
  { title: "คุยความพร้อม", text: "กรอกข้อมูลผู้สนใจ ทีมงานตรวจงบลงทุน พื้นที่ และเป้าหมายการขาย" },
  { title: "ประเมินทำเล", text: "ดูรูปแบบพื้นที่ให้เหมาะกับเคาน์เตอร์หรือซุ้ม พร้อมแนะนำจุดที่ควรปรับ" },
  { title: "เปิดร้านเป็นระบบ", text: "เริ่มขายด้วยสูตร มาตรฐานการทำงาน และระบบหลังบ้านเดิมของแบรนด์" },
];

const franchiseModels = [
  {
    badge: "เริ่มต้นคล่องตัว",
    title: "รูปแบบเคาน์เตอร์",
    price: "55,000 บาท",
    imageSrc: "/kiosk.png",
    imageAlt: "แฟรนไชส์รูปแบบเคาน์เตอร์ 55,000 บาท",
    area: "พื้นที่อย่างต่ำ 2 × 3 เมตร",
    location: "เหมาะกับพื้นที่ในอาคาร หรือพื้นที่ที่มีหลังคา เช่น หน้าร้าน ห้องเช่า พื้นที่ตลาดในร่ม หรือพื้นที่หน้าบ้านที่มีหลังคาคลุม",
    suitableFor: "ผู้เริ่มต้นที่มีพื้นที่จำกัด แต่อยากเริ่มขายจริงแบบเป็นระบบ",
    description: "รูปแบบเคาน์เตอร์เหมาะกับผู้เริ่มต้นที่ต้องการควบคุมงบประมาณ ใช้พื้นที่ไม่มาก แต่ยังได้ภาพลักษณ์ร้านที่ดูเป็นระบบ พร้อมเริ่มต้นขายข้าวเหนียวไก่ทอดได้จริง",
    highlights: ["ใช้พื้นที่ไม่มาก", "ควบคุมงบเริ่มต้นได้ง่าย", "เหมาะกับจุดขายในอาคารหรือพื้นที่มีหลังคา"],
  },
  {
    badge: "ภาพลักษณ์เด่นกว่า",
    title: "รูปแบบซุ้ม",
    price: "99,000 บาท",
    imageSrc: "/stand-alone.png",
    imageAlt: "แฟรนไชส์รูปแบบซุ้ม 99,000 บาท",
    area: "พื้นที่อย่างน้อย 3 × 4 เมตร",
    location: "เหมาะกับพื้นที่ขายที่ต้องการความเป็นร้านมากขึ้น เช่น พื้นที่หน้าถนน จุดขายประจำ ตลาด พื้นที่เช่า หรือจุดที่ต้องการให้ลูกค้ามองเห็นได้ชัด",
    suitableFor: "ผู้ที่ต้องการพื้นที่ทำงานคล่องตัวขึ้น และต้องการภาพลักษณ์ร้านที่เด่นกว่า",
    description: "รูปแบบซุ้มเหมาะกับผู้ที่ต้องการความพร้อมมากขึ้น มีพื้นที่จัดวางอุปกรณ์ ทำงานได้คล่องตัว และสร้างภาพจำของแบรนด์ได้ดีกว่ารูปแบบเคาน์เตอร์",
    highlights: ["พื้นที่ทำงานกว้างขึ้น", "จัดวางอุปกรณ์ได้เป็นระบบกว่า", "สร้างภาพจำหน้าร้านได้ชัดเจน"],
  },
];

const contact = ["โทร 089-272-2789", "Id Line: kaikoy", "TikTok: เหนียวไก่เยอะโคตร"];

const primaryButton = "inline-flex min-h-14 items-center justify-center rounded-full bg-[#ffc400] px-7 py-4 text-base font-black text-black shadow-xl shadow-yellow-300/25 transition hover:-translate-y-0.5 hover:bg-[#ffd84d] focus-ring";
const secondaryButton = "inline-flex min-h-14 items-center justify-center rounded-full border-2 border-white/70 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:text-black focus-ring";

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}>{children}</section>;
}

function SectionHeader({ kicker, title, text, invert = false }: { kicker: string; title: string; text?: string; invert?: boolean }) {
  return (
    <div className="mb-8 max-w-3xl sm:mb-10">
      <p className={`text-xs font-black uppercase tracking-[0.28em] ${invert ? "text-[#ffc400]" : "text-black/45"}`}>{kicker}</p>
      <h2 className={`mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl ${invert ? "text-white" : "text-black"}`}>{title}</h2>
      {text ? <p className={`mt-4 text-base font-bold leading-8 sm:text-lg ${invert ? "text-white/68" : "text-black/62"}`}>{text}</p> : null}
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/92 text-white backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex items-center gap-3 rounded-2xl focus-ring">
          <BrandLogo size={56} priority />
          <div><div className="text-lg font-black leading-tight sm:text-xl">{BRAND_NAME}</div><div className="text-xs font-bold text-white/55 sm:text-sm">{BRAND_SUBTITLE}</div></div>
        </Link>
        <div className="grid grid-cols-2 gap-2 text-sm font-black sm:flex sm:items-center">
          <a href="#models" className="hidden rounded-full px-4 py-3 text-white/80 transition hover:text-[#ffc400] lg:inline-flex">รูปแบบแฟรนไชส์</a>
          <a href="#proof" className="hidden rounded-full px-4 py-3 text-white/80 transition hover:text-[#ffc400] lg:inline-flex">ความน่าเชื่อถือ</a>
          <Link href="/franchise/apply" className="rounded-full bg-[#ffc400] px-5 py-3 text-center text-black transition hover:bg-[#ffd84d] focus-ring">สมัครแฟรนไชส์</Link>
          <Link href="/login" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-center text-white transition hover:bg-white hover:text-black focus-ring">เข้าสู่ระบบ</Link>
        </div>
      </nav>
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-[#ffc400]/60 blur-3xl" />
      <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:rounded-[2.75rem]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Existing uploaded brand food visual is a static public asset. */}
        <img src="/images/AAwebsite.jpg" alt="ข้าวเหนียวไก่ทอด เหนียวไก่เยอะโคตร" className="h-[24rem] w-full rounded-[1.5rem] object-cover sm:h-[34rem] sm:rounded-[2.15rem]" />
        <div className="absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-white/20 bg-black/78 p-5 text-white backdrop-blur">
          <p className="text-sm font-black text-[#ffc400]">Professional Franchise System</p>
          <p className="mt-1 text-2xl font-black">อร่อยแบบร้านจริง พร้อมระบบหลังบ้าน</p>
        </div>
      </div>
    </div>
  );
}

function FranchiseModelsSection() {
  return (
    <Section id="models" className="pt-0">
      <div className="rounded-[2.5rem] bg-[#111] p-5 text-white shadow-2xl shadow-black/15 sm:p-8 lg:p-10">
        <SectionHeader invert kicker="Franchise Models" title="เลือกรูปแบบแฟรนไชส์ให้พอดีกับพื้นที่" text="จัดแพ็กเกจให้เห็นภาพชัดเจนทั้งราคา พื้นที่ใช้งาน รูปแบบหน้าร้าน และความเหมาะสมของทำเล" />
        <div className="grid gap-5 lg:grid-cols-2">
          {franchiseModels.map((model) => (
            <article key={model.title} className="flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white text-black shadow-xl shadow-black/20">
              <div className="bg-[#fff8df] p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3"><span className="rounded-full bg-[#ffc400] px-4 py-2 text-sm font-black text-black">{model.badge}</span><span className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-black/60">ภาพจาก public/{model.imageSrc.replace("/", "")}</span></div>
                <h3 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{model.title}</h3>
                <p className="mt-3 text-4xl font-black sm:text-5xl">{model.price}</p>
              </div>
              <div className="flex h-72 items-center justify-center bg-white p-4 sm:h-80">
                {/* eslint-disable-next-line @next/next/no-img-element -- Uploaded franchise model images are static public assets. */}
                <img src={model.imageSrc} alt={model.imageAlt} className="h-full w-full rounded-[1.5rem] object-contain" />
              </div>
              <div className="flex flex-1 flex-col p-5 sm:p-7">
                <div className="grid gap-3">
                  {[ ["พื้นที่แนะนำ", model.area], ["ลักษณะพื้นที่", model.location], ["เหมาะสำหรับ", model.suitableFor] ].map(([label, value]) => <div key={label} className="rounded-2xl border border-black/10 bg-[#fff9df] p-4"><p className="text-sm font-black text-black/45">{label}</p><p className="mt-1 font-bold leading-7 text-black/68">{value}</p></div>)}
                </div>
                <p className="mt-5 flex-1 text-base font-bold leading-8 text-black/62">{model.description}</p>
                <ul className="mt-5 grid gap-2">{model.highlights.map((highlight) => <li key={highlight} className="flex gap-3 rounded-2xl bg-black px-4 py-3 font-black text-white"><span className="text-[#ffc400]">✓</span><span>{highlight}</span></li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-white text-black">
      <PublicHeader />
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(255,196,0,0.28),transparent_28rem),linear-gradient(135deg,#090909,#1f1b10_52%,#000)] text-white">
        <Section className="pb-14 pt-10 sm:pt-14 lg:pb-20">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#ffc400]/40 bg-[#ffc400]/15 px-4 py-2 text-sm font-black text-[#ffc400]">{BRAND_SUBTITLE}</div>
              <h1 className="mt-5 text-4xl font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">แฟรนไชส์ข้าวเหนียวไก่ทอด ที่ดูเป็นร้านจริงตั้งแต่วันแรก</h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-9 text-white/70 sm:text-xl">ยกระดับแบรนด์เหนียวไก่เยอะโคตรให้สื่อสารแบบร้านอาหารแฟรนไชส์มืออาชีพ พร้อมรูปแบบลงทุนชัดเจน CTA สมัครแฟรนไชส์ และระบบหลังบ้านเดิมที่ยังคงพร้อมใช้งาน</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/franchise/apply" className={primaryButton}>สมัครแฟรนไชส์</Link><a href="#models" className={secondaryButton}>ดูแพ็กเกจ 55,000 / 99,000</a></div>
              <div className="mt-7 flex flex-wrap gap-2">{badges.map((badge) => <span key={badge} className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white/82">✓ {badge}</span>)}</div>
            </div>
            <HeroVisual />
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">{stats.map((item) => <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 backdrop-blur"><div className="text-3xl font-black text-[#ffc400]">{item.value}</div><div className="mt-1 font-black">{item.label}</div><div className="text-sm font-bold text-white/55">{item.detail}</div></div>)}</div>
        </Section>
      </section>

      <Section id="proof" className="bg-[#fff9df] sm:rounded-[3rem]">
        <SectionHeader kicker="Proof" title="แบรนด์ที่เติบโตจากการขายจริง" text="โครงสร้างหน้าเว็บเน้นความน่าเชื่อถือแบบเว็บไซต์ร้านอาหาร/แฟรนไชส์ มีหลักฐานการทำงานจริงและระบบที่ช่วยให้หลายสาขาทำงานตามมาตรฐานเดียวกัน" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{proofCards.map((item, index) => <article key={item.title} className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-lg shadow-black/5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-black text-[#ffc400]">0{index + 1}</div><h3 className="mt-5 text-2xl font-black">{item.title}</h3><p className="mt-3 text-sm font-bold leading-7 text-black/60">{item.text}</p></article>)}</div>
      </Section>

      <Section id="franchise-details">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="overflow-hidden rounded-[2rem] bg-[#ffc400] p-4 shadow-xl shadow-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- Existing brand imagery from public assets. */}
            <img src="/fronshop.jpg" alt="หน้าร้านเหนียวไก่เยอะโคตร" className="h-72 w-full rounded-[1.5rem] object-cover" />
          </div>
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-10"><p className="text-xs font-black uppercase tracking-[0.28em] text-black/45">Founder</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">สร้างโดยคนที่ลงมือขายจริง</h2><p className="mt-5 text-lg font-bold leading-9 text-black/68">คมน์ ม่วงคำ ผู้ก่อตั้งแบรนด์เหนียวไก่เยอะโคตร อดีตรับราชการ 27 ปี เริ่มต้นธุรกิจจากทุน 4,000 บาท และพัฒนาจากร้านเล็ก ๆ ให้เป็นระบบแฟรนไชส์ที่เน้นการลงมือทำจริง</p></div>
        </div>
      </Section>

      <Section className="pt-0"><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-[2rem] bg-black p-6 text-white sm:p-8"><h2 className="text-3xl font-black">เหมาะกับใคร</h2><ul className="mt-6 grid gap-3">{fit.map((x) => <li key={x} className="rounded-2xl bg-white/10 p-4 text-lg font-black">✓ {x}</li>)}</ul></div><div className="rounded-[2rem] border border-black/10 bg-[#fff9df] p-6 sm:p-8"><h2 className="text-3xl font-black">ไม่เหมาะกับใคร</h2><ul className="mt-6 grid gap-3">{notFit.map((x) => <li key={x} className="rounded-2xl bg-white p-4 text-lg font-black text-black/70">! {x}</li>)}</ul></div></div></Section>

      <Section className="pt-0"><SectionHeader kicker="System" title="สิ่งที่ได้จากระบบแฟรนไชส์" text="ไม่ใช่แค่หน้าร้าน แต่รวมแนวทางทำงาน สูตร ระบบขาย และข้อมูลหลังบ้านสำหรับติดตามสาขา" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item) => <div key={item} className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5"><div className="mb-5 h-2 w-16 rounded-full bg-[#ffc400]" /><h3 className="text-2xl font-black">{item}</h3></div>)}</div></Section>

      <FranchiseModelsSection />

      <Section className="pt-0"><div className="rounded-[2.5rem] bg-[#fff9df] p-6 sm:p-10"><SectionHeader kicker="How to start" title="เริ่มต้นอย่างเป็นขั้นตอน" text="วาง flow ให้ผู้สนใจเข้าใจง่าย ตั้งแต่การสมัครจนถึงการเปิดร้านจริง" /><div className="grid gap-4 lg:grid-cols-3">{steps.map((step, index) => <article key={step.title} className="rounded-[1.75rem] bg-white p-6 shadow-lg shadow-black/5"><div className="text-4xl font-black text-[#ffc400]">0{index + 1}</div><h3 className="mt-4 text-2xl font-black">{step.title}</h3><p className="mt-3 font-bold leading-7 text-black/60">{step.text}</p></article>)}</div></div></Section>

      <Section className="pt-0"><div className="overflow-hidden rounded-[2.5rem] bg-black p-8 text-center text-white shadow-2xl shadow-black/20 sm:p-12"><h2 className="mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">พร้อมคุยเรื่องทำเลและรูปแบบลงทุนของคุณหรือยัง?</h2><p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-8 text-white/70 sm:text-lg">กรอกข้อมูลเบื้องต้น ทีมงานจะตรวจสอบทำเล งบลงทุน และความพร้อมก่อนติดต่อกลับ</p><Link href="/franchise/apply" className={`${primaryButton} mt-8`}>ลงทะเบียนผู้สนใจแฟรนไชส์</Link></div></Section>

      <footer className="border-t border-black/10 bg-[#fff9df]"><div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8"><div className="flex items-center gap-3"><BrandLogo size={52} /><div><div className="text-2xl font-black">{BRAND_NAME}</div><div className="mt-1 font-bold text-black/55">{BRAND_SUBTITLE}</div></div></div><div className="grid gap-2 text-sm font-black sm:grid-cols-2 lg:text-right">{contact.map((item) => <span key={item}>{item}</span>)}<Link href="/login" className="underline decoration-2 underline-offset-4">เข้าสู่ระบบ</Link></div></div></footer>
    </main>
  );
}
