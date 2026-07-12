/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CategoryMenuToggle } from "@/components/category-menu-toggle";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const categoryMenu = [
  { label: "ภาพรวมธุรกิจ", href: "#business-overview", detail: "ข้าวเหนียวไก่ทอดพร้อมขาย" },
  { label: "แพ็กเกจแฟรนไชส์", href: "#franchise-packages", detail: "55,000 / 99,000 บาท" },
  { label: "หนังสือสูตรไก่ทอด", href: "#book-recipes", detail: "10 สูตร + ข้าวเหนียว + ต้นทุน" },
  { label: "พื้นที่ที่ต้องใช้", href: "#required-space", detail: "เริ่ม 2 × 3 เมตร" },
  { label: "เหมาะกับใคร", href: "#target-audience", detail: "ผู้เริ่มต้นและคนมีทำเล" },
  { label: "ระบบหลังบ้าน", href: "#back-office-system", detail: "ยอดขาย วัตถุดิบ สต็อก" },
];

const stats = [
  { value: "55K", label: "เริ่มต้น", detail: "แพ็กเกจเคาน์เตอร์" },
  { value: "2", label: "รูปแบบ", detail: "เคาน์เตอร์ / ซุ้ม" },
  { value: "2×3 ม.", label: "พื้นที่ขั้นต่ำ", detail: "เริ่มขายได้จริง" },
];

const catalogCards = [
  { title: "แพ็กเกจเริ่มต้น", text: "สำหรับพื้นที่เล็ก คุมงบง่าย เหมาะกับคนเริ่มขายจริง", image: "/kiosk.png", tag: "Counter" },
  { title: "หน้าร้านเด่น", text: "ซุ้มขนาดใหญ่ขึ้น เห็นชัด เหมาะกับทำเลถนนหรือตลาด", image: "/stand-alone.png", tag: "Kiosk" },
  { title: "แบรนด์ร้านจริง", text: "ภาพจำข้าวเหนียวไก่ทอดพร้อมระบบทำงานหลังร้าน", image: "/fronshop.jpg", tag: "Brand" },
];

const franchiseModels = [
  {
    badge: "Starter Pack",
    title: "รูปแบบเคาน์เตอร์",
    price: "55,000 บาท",
    imageSrc: "/kiosk.png",
    imageAlt: "แฟรนไชส์รูปแบบเคาน์เตอร์ 55,000 บาท",
    area: "พื้นที่อย่างต่ำ 2 × 3 เมตร",
    location: "เหมาะกับพื้นที่ในอาคาร พื้นที่ที่มีหลังคา หน้าร้าน ห้องเช่า ตลาดในร่ม หรือพื้นที่หน้าบ้านที่มีหลังคาคลุม",
    suitableFor: "ผู้เริ่มต้นที่มีพื้นที่จำกัด แต่อยากเริ่มขายจริงแบบเป็นระบบ",
    highlights: ["ใช้พื้นที่ไม่มาก", "คุมงบเริ่มต้นง่าย", "เหมาะกับจุดขายในอาคาร"],
  },
  {
    badge: "Signature Pack",
    title: "รูปแบบซุ้ม",
    price: "99,000 บาท",
    imageSrc: "/stand-alone.png",
    imageAlt: "แฟรนไชส์รูปแบบซุ้ม 99,000 บาท",
    area: "พื้นที่อย่างน้อย 3 × 4 เมตร",
    location: "เหมาะกับพื้นที่หน้าถนน จุดขายประจำ ตลาด พื้นที่เช่า หรือจุดที่ต้องการให้ลูกค้ามองเห็นชัด",
    suitableFor: "ผู้ที่ต้องการพื้นที่ทำงานคล่องตัวขึ้น และต้องการภาพลักษณ์ร้านที่เด่นกว่า",
    highlights: ["ทำงานคล่องตัวขึ้น", "จัดวางอุปกรณ์เป็นระบบ", "สร้างภาพจำหน้าร้านชัด"],
  },
];

const recipeBookItems = [
  "ไก่ทอดดั้งเดิม",
  "ไก่ทอดพริก",
  "หนังไก่ทอด",
  "เครื่องในทอด",
  "เอ็นไก่ทอด",
  "ไก่เขย่ารสต้มยำ",
  "ไก่เขย่ารสชีส",
  "ไก่เขย่ารสวิงแซ่บ",
  "ไก่เขย่ารสปาปริก้า",
  "ไก่หยอง",
];

const recipeBookExtras = ["สูตรนึ่งข้าวเหนียว"];
const recipeBookCosting = ["แนวทางคำนวณต้นทุน", "ตัวอย่างการคิดต้นทุนต่อห่อ", "แนวทางประเมินราคาขายและกำไรเบื้องต้น"];

const proofCards = [
  { title: "ร้านจริง", text: "เริ่มจากร้านที่ขายอาหารจริงทุกวัน เห็นปัญหาและโอกาสจากหน้าร้านโดยตรง" },
  { title: "ลูกค้าจริง", text: "เข้าใจพฤติกรรมลูกค้าหน้างาน เมนูหลัก ช่วงเวลาขาย และการจัดการคิว" },
  { title: "ระบบจริง", text: "มีระบบหลังบ้านสำหรับยอดขาย วัตถุดิบ คงเหลือ และรายการสั่งของของแต่ละสาขา" },
  { title: "ทีมงานดูแลจริง", text: "ประเมินผู้สมัคร ทำเล งบลงทุน และความพร้อมก่อนเริ่มเปิดร้านอย่างเป็นขั้นตอน" },
];

const fit = ["อยากเริ่มธุรกิจอาหารที่จับต้องได้", "มีทำเลหรือกำลังหาทำเลจริง", "พร้อมลงมือดูแลร้านและทีมงาน", "ต้องการระบบช่วยคุมต้นทุนและวัตถุดิบ"];
const notFit = ["ต้องการลงทุนแล้วรอรับกำไรทันที", "ไม่พร้อมทำตามมาตรฐานร้าน", "ไม่มีเวลาติดตามงานหน้าร้าน", "มองแฟรนไชส์เป็นแค่ชุดอุปกรณ์ราคาถูก"];
const benefits = ["สูตรไก่หมักพร้อมทอด", "ระบบการขายหน้าร้าน", "การคำนวณต้นทุน", "ระบบสั่งวัตถุดิบ", "ระบบหลังบ้าน", "การดูแลหลังเปิดร้าน"];
const steps = [
  { title: "คุยความพร้อม", text: "กรอกข้อมูลผู้สนใจ ทีมงานตรวจงบลงทุน พื้นที่ และเป้าหมายการขาย" },
  { title: "ประเมินทำเล", text: "ดูรูปแบบพื้นที่ให้เหมาะกับเคาน์เตอร์หรือซุ้ม พร้อมแนะนำจุดที่ควรปรับ" },
  { title: "เปิดร้านเป็นระบบ", text: "เริ่มขายด้วยสูตร มาตรฐานการทำงาน และระบบหลังบ้านเดิมของแบรนด์" },
];
const contact = ["โทร 089-272-2789", "Id Line: kaikoy", "TikTok: เหนียวไก่เยอะโคตร"];

const primaryButton = "inline-flex min-h-14 items-center justify-center rounded-xl bg-[#d71920] px-7 py-4 text-base font-black text-white shadow-xl shadow-[#d71920]/25 transition hover:-translate-y-0.5 hover:bg-[#b9151b] focus-ring";
const secondaryButton = "inline-flex min-h-14 items-center justify-center rounded-xl bg-[#1f1f1f] px-7 py-4 text-base font-black text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-black focus-ring";

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}>{children}</section>;
}

function SectionHeader({ kicker, title, text, invert = false }: { kicker: string; title: string; text?: string; invert?: boolean }) {
  return (
    <div className="mb-8 max-w-3xl sm:mb-10">
      <p className={`text-xs font-black uppercase tracking-[0.28em] ${invert ? "text-[#f6c400]" : "text-[#f47b00]"}`}>{kicker}</p>
      <h2 className={`mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl ${invert ? "text-white" : "text-[#151515]"}`}>{title}</h2>
      {text ? <p className={`mt-4 text-base font-bold leading-8 sm:text-lg ${invert ? "text-white/70" : "text-[#666666]"}`}>{text}</p> : null}
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 bg-[#1f1f1f] text-white shadow-xl shadow-black/10">
      <nav className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
          <span className="shrink-0 rounded-2xl bg-white p-1"><BrandLogo size={54} priority /></span>
          <div className="min-w-0"><div className="max-w-[12.5rem] whitespace-normal break-words text-lg font-black leading-tight sm:max-w-none sm:text-2xl lg:text-3xl">{BRAND_NAME}</div></div>
        </Link>
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 lg:items-end">
          <div className="grid grid-cols-2 gap-2 text-xs font-black sm:text-sm lg:flex lg:items-center">
            <a href="#franchise-packages" className="hidden rounded-xl px-4 py-3 text-white/72 transition hover:bg-white/10 hover:text-white lg:inline-flex">แพ็กเกจ</a>
            <a href="#back-office-system" className="hidden rounded-xl px-4 py-3 text-white/72 transition hover:bg-white/10 hover:text-white lg:inline-flex">ระบบหลังบ้าน</a>
            <Link href="/franchise/apply" className="rounded-xl bg-[#f47b00] px-3 py-3 text-center text-white transition hover:bg-[#ff8c19] focus-ring sm:px-5">สมัครแฟรนไชส์</Link>
            <Link href="/login" className="rounded-xl border border-white/20 bg-white px-3 py-3 text-center text-[#1f1f1f] transition hover:bg-[#fff1df] focus-ring sm:px-5">เข้าสู่ระบบ</Link>
          </div>
          <p className="max-w-[12rem] text-center text-[0.68rem] font-bold leading-5 text-white/68 sm:max-w-none sm:text-xs lg:text-right">{BRAND_SUBTITLE}</p>
        </div>
      </nav>
    </header>
  );
}

function HeroCatalog() {
  return (
    <Section id="business-overview" className="py-8 sm:py-10 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[290px_1fr]">
        <aside className="rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-xl shadow-black/5">
          <div className="rounded-2xl bg-[#1f1f1f] px-5 py-4 text-white"><p className="text-sm font-black text-[#f6c400]">CATEGORY MENU</p><h2 className="mt-1 text-2xl font-black">เลือกดูข้อมูล</h2></div>
          <CategoryMenuToggle items={categoryMenu} />
        </aside>

        <div className="overflow-hidden rounded-[2rem] bg-[#f47b00] shadow-2xl shadow-[#f47b00]/20">
          <div className="grid min-h-[31rem] lg:grid-cols-[1.02fr_0.98fr]">
            <div className="flex flex-col justify-center p-6 text-white sm:p-10 lg:p-12">
              <div className="inline-flex w-fit rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-black text-[#f6c400]">Franchise Catalog Landing Page</div>
              <h1 className="mt-5 text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">แฟรนไชส์ข้าวเหนียวไก่ทอด เข้าใจง่ายในหน้าเดียว</h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-9 text-white/88 sm:text-xl">รวมภาพธุรกิจ แพ็กเกจ ราคา พื้นที่ที่ต้องใช้ ความเหมาะสม และช่องทางสมัครสำหรับผู้สนใจแฟรนไชส์เหนียวไก่เยอะโคตร</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/franchise/apply" className={primaryButton}>สมัคร / สอบถามแฟรนไชส์</Link><a href="#franchise-packages" className={secondaryButton}>ดูแพ็กเกจลงทุน</a></div>
            </div>
            <div className="relative min-h-[24rem] bg-[#fff1df] p-5">
              <div className="absolute right-5 top-5 z-10 rounded-2xl bg-white px-5 py-3 text-right shadow-xl"><p className="text-sm font-black text-[#666666]">ราคาเริ่มต้น</p><p className="text-3xl font-black text-[#d71920]">55,000</p></div>
              <img src="/images/AAwebsite.jpg" alt="ข้าวเหนียวไก่ทอด เหนียวไก่เยอะโคตร" className="h-full min-h-[24rem] w-full rounded-[1.5rem] object-cover shadow-2xl shadow-black/15" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{stats.map((item) => <div key={item.label} className="rounded-[1.5rem] border border-[#eadfca] bg-white p-5 shadow-lg shadow-black/5"><div className="text-3xl font-black text-[#d71920]">{item.value}</div><div className="mt-1 font-black">{item.label}</div><div className="text-sm font-bold text-[#666666]">{item.detail}</div></div>)}</div>
    </Section>
  );
}

function CatalogCards() {
  return <Section className="pt-0"><div className="grid gap-4 lg:grid-cols-3">{catalogCards.map((card) => <article key={card.title} className="group overflow-hidden rounded-[1.75rem] border border-[#eadfca] bg-white shadow-xl shadow-black/5"><div className="relative h-56 bg-[#fff1df] p-4"><img src={card.image} alt={card.title} className="h-full w-full rounded-[1.25rem] object-contain transition group-hover:scale-[1.03]" /><span className="absolute left-6 top-6 rounded-full bg-[#1f1f1f] px-4 py-2 text-sm font-black text-[#f6c400]">{card.tag}</span></div><div className="p-6"><h3 className="text-2xl font-black">{card.title}</h3><p className="mt-2 font-bold leading-7 text-[#666666]">{card.text}</p></div></article>)}</div></Section>;
}

function RecipeBookSection() {
  return (
    <Section id="book-recipes" className="pt-0">
      <div className="overflow-hidden rounded-[2.5rem] border border-[#eadfca] bg-white shadow-2xl shadow-black/8">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-8 lg:p-10">
            <SectionHeader
              kicker="Recipe Book"
              title="หนังสือสูตรไก่ทอด 10 สูตร"
              text="รวมสูตรไก่ทอดที่แม่ค้าทำขายจริงหน้าร้าน พร้อมสูตรนึ่งข้าวเหนียว และแนวทางคำนวณต้นทุนท้ายเล่ม"
            />
            <div className="grid gap-4 text-base font-bold leading-8 text-[#666666] sm:text-lg">
              <p>หนังสือสูตรไก่ทอด 10 สูตรเล่มนี้ รวบรวมจากสูตรที่แม่ค้าใช้ทำขายจริงหน้าร้าน เหมาะสำหรับคนที่อยากเริ่มต้นขายข้าวเหนียวไก่ทอด ต้องการสูตรตั้งต้นที่ชัดเจน และอยากเข้าใจแนวทางการคิดต้นทุนก่อนเริ่มขายจริง</p>
              <p>ภายในเล่มมีทั้งสูตรไก่ทอดดั้งเดิม ไก่ทอดพริก หนังไก่ทอด เครื่องในทอด เอ็นไก่ทอด ไก่เขย่า 4 เมนู และไก่หยอง พร้อมแถมฟรีสูตรนึ่งข้าวเหนียว และแนวทางคำนวณต้นทุนท้ายเล่ม เพื่อให้ผู้อ่านเห็นภาพการทำขายจริงมากขึ้น</p>
            </div>

            <div className="mt-7 rounded-[1.75rem] bg-[#fff8ed] p-4 sm:p-5">
              <h3 className="text-2xl font-black text-[#151515]">รายการสูตรในเล่ม</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {recipeBookItems.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#eadfca] bg-white p-3 shadow-sm shadow-black/5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f47b00] text-sm font-black text-white">{index + 1}</span>
                    <span className="font-black text-[#151515]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#eadfca] bg-[#fff1df] p-5">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d71920]">ของแถมฟรี</p>
                <ul className="mt-3 grid gap-2">{recipeBookExtras.map((item) => <li key={item} className="font-black text-[#151515]">✓ {item}</li>)}</ul>
              </div>
              <div className="rounded-[1.5rem] border border-[#eadfca] bg-[#1f1f1f] p-5 text-white">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#f6c400]">ท้ายเล่ม</p>
                <ul className="mt-3 grid gap-2">{recipeBookCosting.map((item) => <li key={item} className="font-black">✓ {item}</li>)}</ul>
              </div>
            </div>

            <div className="mt-7 flex flex-col items-start gap-3">
              <a href="#footer-contact" className={primaryButton}>สนใจหนังสือสูตรไก่ทอด</a>
              <p className="font-bold leading-7 text-[#666666]">เหมาะสำหรับผู้เริ่มต้นที่อยากฝึกทำขาย ก่อนตัดสินใจลงทุนแฟรนไชส์</p>
            </div>
          </div>

          <div className="bg-[#fff1df] p-5 sm:p-8 lg:p-10">
            <div className="flex h-full min-h-[26rem] items-center justify-center rounded-[2rem] bg-white p-4 shadow-inner shadow-black/5 sm:p-6">
              <img
                src="/book.png"
                alt="หนังสือสูตรไก่ทอด 10 สูตร"
                className="h-full w-full rounded-3xl bg-white object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function FranchiseModelsSection() {
  return (
    <Section id="franchise-packages" className="pt-0">
      <div className="rounded-[2.5rem] border border-[#eadfca] bg-white p-5 shadow-2xl shadow-black/8 sm:p-8 lg:p-10">
        <SectionHeader kicker="Packages" title="แพ็กเกจแฟรนไชส์แบบเปรียบเทียบง่าย" text="วางข้อมูลแบบ catalog เพื่อให้ผู้สนใจเห็นราคา พื้นที่ ทำเลที่เหมาะสม และจุดเด่นของแต่ละรูปแบบทันที" />
        <div className="grid gap-5 lg:grid-cols-2">
          {franchiseModels.map((model, index) => (
            <article key={model.title} className="flex flex-col overflow-hidden rounded-[2rem] border border-[#eadfca] bg-[#fff8ed] text-[#151515] shadow-xl shadow-black/8">
              <div className="grid gap-4 bg-[#1f1f1f] p-5 text-white sm:p-7 md:grid-cols-[1fr_auto] md:items-start"><div><span className="rounded-full bg-[#f6c400] px-4 py-2 text-sm font-black text-[#151515]">{model.badge}</span><h3 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{model.title}</h3></div><div className="rounded-2xl bg-white px-5 py-4 text-left md:text-right"><p className="text-sm font-black text-[#666666]">ราคา</p><p className="text-3xl font-black text-[#d71920]">{model.price}</p></div></div>
              <div className="flex h-72 items-center justify-center bg-white p-4 sm:h-80"><img src={model.imageSrc} alt={model.imageAlt} className="h-full w-full rounded-[1.5rem] object-contain" /></div>
              <div className="flex flex-1 flex-col p-5 sm:p-7">
                <div id={index === 0 ? "required-space" : undefined} className="grid scroll-mt-28 gap-3">{[["พื้นที่แนะนำ", model.area], ["ลักษณะพื้นที่", model.location], ["เหมาะสำหรับ", model.suitableFor]].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#eadfca] bg-white p-4"><p className="text-sm font-black text-[#f47b00]">{label}</p><p className="mt-1 font-bold leading-7 text-[#666666]">{value}</p></div>)}</div>
                <ul className="mt-5 grid gap-2">{model.highlights.map((highlight) => <li key={highlight} className="flex gap-3 rounded-2xl border border-[#eadfca] bg-[#fff1df] px-4 py-3 font-black text-[#151515]"><span className="text-[#d71920]">✓</span><span>{highlight}</span></li>)}</ul>
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
    <main className="min-h-dvh bg-[#fff8ed] text-[#151515]">
      <PublicHeader />
      <HeroCatalog />
      <CatalogCards />

      <Section id="proof" className="pt-0"><SectionHeader kicker="Business Proof" title="แบรนด์ที่เติบโตจากการขายจริง" text="เหนียวไก่เยอะโคตรเติบโตจากประสบการณ์งานราชการ 27 ปี ผสานกับการเริ่มต้นขายไก่ทอดด้วยเงินเพียง 4,000 บาท ยืนขายจริง แก้ปัญหาจริง เรียนรู้พฤติกรรมลูกค้าจริง แล้วค่อย ๆ เปลี่ยนประสบการณ์หน้าร้านให้กลายเป็นระบบแฟรนไชส์ที่ถ่ายทอดต่อได้" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{proofCards.map((item, index) => <article key={item.title} className="rounded-[1.75rem] border border-[#eadfca] bg-white p-5 shadow-lg shadow-black/5"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadfca] bg-[#fff1df] text-sm font-black text-[#d71920]">0{index + 1}</div><h3 className="mt-5 text-2xl font-black">{item.title}</h3><p className="mt-3 text-sm font-bold leading-7 text-[#666666]">{item.text}</p></article>)}</div></Section>

      <RecipeBookSection />

      <FranchiseModelsSection />

      <Section id="target-audience" className="pt-0"><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-[2rem] bg-[#1f1f1f] p-6 text-white sm:p-8"><h2 className="text-3xl font-black">เหมาะกับใคร</h2><ul className="mt-6 grid gap-3">{fit.map((x) => <li key={x} className="rounded-2xl bg-white/10 p-4 text-lg font-black">✓ {x}</li>)}</ul></div><div className="rounded-[2rem] border border-[#eadfca] bg-white p-6 sm:p-8"><h2 className="text-3xl font-black">ไม่เหมาะกับใคร</h2><ul className="mt-6 grid gap-3">{notFit.map((x) => <li key={x} className="rounded-2xl bg-[#fff1df] p-4 text-lg font-black text-[#666666]">! {x}</li>)}</ul></div></div></Section>

      <Section id="back-office-system" className="pt-0"><SectionHeader kicker="Back Office System" title="สิ่งที่ได้จากระบบแฟรนไชส์" text="ไม่ใช่แค่หน้าร้าน แต่รวมแนวทางทำงาน สูตร ระบบขาย และข้อมูลหลังบ้านสำหรับติดตามสาขา" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item) => <div key={item} className="rounded-[1.75rem] border border-[#eadfca] bg-white p-6 shadow-xl shadow-black/5"><div className="mb-5 h-2 w-16 rounded-full bg-[#f47b00]" /><h3 className="text-2xl font-black">{item}</h3></div>)}</div></Section>

      <Section className="pt-0"><div className="rounded-[2.5rem] bg-[#fff1df] p-6 sm:p-10"><SectionHeader kicker="How to start" title="เริ่มต้นอย่างเป็นขั้นตอน" text="วาง flow ให้ผู้สนใจเข้าใจง่าย ตั้งแต่การสมัครจนถึงการเปิดร้านจริง" /><div className="grid gap-4 lg:grid-cols-3">{steps.map((step, index) => <article key={step.title} className="rounded-[1.75rem] bg-white p-6 shadow-lg shadow-black/5"><div className="text-4xl font-black text-[#d71920]">0{index + 1}</div><h3 className="mt-4 text-2xl font-black">{step.title}</h3><p className="mt-3 font-bold leading-7 text-[#666666]">{step.text}</p></article>)}</div></div></Section>

      <Section className="pt-0"><div className="overflow-hidden rounded-[2.5rem] bg-[#1f1f1f] p-8 text-center text-white shadow-2xl shadow-black/20 sm:p-12"><h2 className="mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">พร้อมคุยเรื่องทำเลและรูปแบบลงทุนของคุณหรือยัง?</h2><p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-8 text-white/70 sm:text-lg">กรอกข้อมูลเบื้องต้น ทีมงานจะตรวจสอบทำเล งบลงทุน และความพร้อมก่อนติดต่อกลับ</p><Link href="/franchise/apply" className={`${primaryButton} mt-8`}>ลงทะเบียนผู้สนใจแฟรนไชส์</Link></div></Section>

      <footer id="footer-contact" className="border-t border-[#eadfca] bg-white"><div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8"><div className="flex items-center gap-3"><BrandLogo size={52} /><div><div className="text-2xl font-black">{BRAND_NAME}</div><div className="mt-1 font-bold text-[#666666]">{BRAND_SUBTITLE}</div></div></div><div className="grid gap-2 text-sm font-black sm:grid-cols-2 lg:text-right">{contact.map((item) => <span key={item}>{item}</span>)}<Link href="/login" className="underline decoration-2 underline-offset-4">เข้าสู่ระบบ</Link></div></div></footer>
    </main>
  );
}
