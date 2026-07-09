import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const proofCards = [
  {
    title: "ร้านจริง",
    text: "เริ่มจากร้านที่ขายอาหารจริงทุกวัน เห็นปัญหาและโอกาสจากหน้าร้านโดยตรง",
  },
  {
    title: "ลูกค้าจริง",
    text: "เข้าใจพฤติกรรมลูกค้าหน้างาน เมนูหลัก ช่วงเวลาขาย และการจัดการคิว",
  },
  {
    title: "ระบบจริง",
    text: "มีระบบหลังบ้านสำหรับยอดขาย วัตถุดิบ คงเหลือ และรายการสั่งของของแต่ละสาขา",
  },
  {
    title: "ทีมงานดูแลจริง",
    text: "ประเมินผู้สมัคร ทำเล งบลงทุน และความพร้อมก่อนเริ่มเปิดร้านอย่างเป็นขั้นตอน",
  },
];

const badges = ["มีสาขาจริง", "มีระบบหลังบ้าน", "ใช้ประสบการณ์หน้าร้านจริง"];
const fit = [
  "อยากเริ่มธุรกิจอาหารที่จับต้องได้",
  "มีทำเลหรือกำลังหาทำเลจริง",
  "พร้อมลงมือดูแลร้านและทีมงาน",
  "ต้องการระบบช่วยคุมต้นทุนและวัตถุดิบ",
];
const notFit = [
  "ต้องการลงทุนแล้วรอรับกำไรทันที",
  "ไม่พร้อมทำตามมาตรฐานร้าน",
  "ไม่มีเวลาติดตามงานหน้าร้าน",
  "มองแฟรนไชส์เป็นแค่ชุดอุปกรณ์ราคาถูก",
];
const benefits = [
  "สูตรไก่หมักพร้อมทอด",
  "ระบบการขายหน้าร้าน",
  "การคำนวณต้นทุน",
  "ระบบสั่งวัตถุดิบ",
  "ระบบหลังบ้าน",
  "การดูแลหลังเปิดร้าน",
];

const franchiseModels = [
  {
    badge: "เหมาะกับพื้นที่จำกัด",
    title: "รูปแบบเคาน์เตอร์",
    price: "55,000 บาท",
    placeholder: "พื้นที่สำหรับใส่รูปภาพรูปแบบเคาน์เตอร์",
    area: "พื้นที่อย่างต่ำ 2 × 3 เมตร",
    location: "เหมาะกับพื้นที่ในอาคาร หรือพื้นที่ที่มีหลังคา เช่น หน้าร้าน ห้องเช่า พื้นที่ตลาดในร่ม หรือพื้นที่หน้าบ้านที่มีหลังคาคลุม",
    suitableFor:
      "ผู้เริ่มต้นที่มีพื้นที่จำกัด แต่อยากเริ่มขายจริงแบบเป็นระบบ",
    description:
      "รูปแบบเคาน์เตอร์เหมาะกับผู้เริ่มต้นที่ต้องการควบคุมงบประมาณ ใช้พื้นที่ไม่มาก แต่ยังได้ภาพลักษณ์ร้านที่ดูเป็นระบบ พร้อมเริ่มต้นขายข้าวเหนียวไก่ทอดได้จริง",
    highlights: [
      "ใช้พื้นที่ไม่มาก",
      "ควบคุมงบเริ่มต้นได้ง่าย",
      "เหมาะกับจุดขายในอาคารหรือพื้นที่มีหลังคา",
    ],
  },
  {
    badge: "พื้นที่ทำงานคล่องตัวขึ้น",
    title: "รูปแบบซุ้ม",
    price: "99,000 บาท",
    placeholder: "พื้นที่สำหรับใส่รูปภาพรูปแบบซุ้ม",
    area: "พื้นที่อย่างน้อย 3 × 4 เมตร",
    location:
      "เหมาะกับพื้นที่ขายที่ต้องการความเป็นร้านมากขึ้น เช่น พื้นที่หน้าถนน จุดขายประจำ ตลาด พื้นที่เช่า หรือจุดที่ต้องการให้ลูกค้ามองเห็นได้ชัด",
    suitableFor:
      "ผู้ที่ต้องการพื้นที่ทำงานคล่องตัวขึ้น และต้องการภาพลักษณ์ร้านที่เด่นกว่า",
    description:
      "รูปแบบซุ้มเหมาะกับผู้ที่ต้องการความพร้อมมากขึ้น มีพื้นที่จัดวางอุปกรณ์ ทำงานได้คล่องตัว และสร้างภาพจำของแบรนด์ได้ดีกว่ารูปแบบเคาน์เตอร์",
    highlights: [
      "พื้นที่ทำงานกว้างขึ้น",
      "จัดวางอุปกรณ์ได้เป็นระบบกว่า",
      "สร้างภาพจำหน้าร้านได้ชัดเจน",
    ],
  },
];

const contact = [
  "โทร: 089-272-2789",
  "Id Line: kaikoy",
  "Facebook: เหนียวไก่เยอะโคตร",
  "TikTok: เหนียวไก่เยอะโคตร",
];

const primaryButton =
  "inline-flex min-h-14 items-center justify-center rounded-full bg-[#ffc400] px-7 py-4 text-base font-black text-black shadow-xl shadow-yellow-300/30 transition hover:-translate-y-0.5 hover:bg-[#ffd84d] focus-ring";
const secondaryButton =
  "inline-flex min-h-14 items-center justify-center rounded-full border-2 border-black bg-white px-7 py-4 text-base font-black text-black transition hover:-translate-y-0.5 hover:bg-black hover:text-white focus-ring";

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mb-8 max-w-3xl sm:mb-10">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-black/45">
        {kicker}
      </p>
      <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-black sm:text-5xl">
        {title}
      </h2>
      {text ? (
        <p className="mt-4 text-base font-bold leading-8 text-black/62 sm:text-lg">
          {text}
        </p>
      ) : null}
    </div>
  );
}


function FranchiseModelsSection() {
  return (
    <Section className="pt-0">
      <div className="rounded-[2.5rem] bg-[#fff9df] p-5 shadow-inner shadow-yellow-200/40 sm:p-8 lg:p-10">
        <SectionHeader
          kicker="Franchise Models"
          title="รูปแบบแฟรนไชส์ที่เลือกได้"
          text="เลือกขนาดการลงทุนให้เหมาะกับพื้นที่ งบประมาณ และรูปแบบการขายของคุณ"
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {franchiseModels.map((model) => (
            <article
              key={model.title}
              className="flex flex-col rounded-[2rem] border border-black/10 bg-white p-5 shadow-xl shadow-black/5 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="rounded-full bg-[#ffc400] px-4 py-2 text-sm font-black text-black shadow-sm shadow-yellow-300/30">
                  {model.badge}
                </span>
                <span className="rounded-full border border-black/10 bg-[#fff9df] px-4 py-2 text-sm font-black text-black/60">
                  จะเพิ่มรูปภาพภายหลัง
                </span>
              </div>
              <h3 className="mt-5 text-3xl font-black leading-tight text-black sm:text-4xl">
                {model.title}
              </h3>
              <p className="mt-3 text-4xl font-black text-black sm:text-5xl">
                {model.price}
              </p>

              <div className="mt-6 flex min-h-56 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-black/15 bg-[#f8f8f8] p-6 text-center sm:min-h-64">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg shadow-black/5">
                    🖼️
                  </div>
                  <p className="mt-4 text-lg font-black text-black/55">
                    {model.placeholder}
                  </p>
                  <p className="mt-1 text-sm font-bold text-black/40">
                    จะเพิ่มรูปภาพภายหลัง
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-[#fff9df] p-4">
                  <p className="text-sm font-black text-black/45">พื้นที่แนะนำ</p>
                  <p className="mt-1 text-lg font-black text-black">{model.area}</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-black text-black/45">ลักษณะพื้นที่</p>
                  <p className="mt-1 font-bold leading-7 text-black/65">
                    {model.location}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-sm font-black text-black/45">เหมาะสำหรับ</p>
                  <p className="mt-1 font-bold leading-7 text-black/65">
                    {model.suitableFor}
                  </p>
                </div>
              </div>

              <p className="mt-5 flex-1 text-base font-bold leading-8 text-black/62">
                {model.description}
              </p>
              <ul className="mt-5 grid gap-2">
                {model.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex gap-3 rounded-2xl bg-black px-4 py-3 font-black text-white"
                  >
                    <span className="text-[#ffc400]">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-[2rem] bg-black p-6 text-center text-white sm:p-8">
          <p className="text-2xl font-black">
            ยังไม่แน่ใจว่ารูปแบบไหนเหมาะกับพื้นที่ของคุณ?
          </p>
          <Link href="/franchise/apply" className={`${primaryButton} mt-5`}>
            สอบถามรูปแบบที่เหมาะกับฉัน
          </Link>
        </div>
      </div>
    </Section>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/92 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl focus-ring"
        >
          <BrandLogo size={56} priority />
          <div>
            <div className="text-lg font-black leading-tight sm:text-xl">
              {BRAND_NAME}
            </div>
            <div className="text-xs font-bold text-black/55 sm:text-sm">
              {BRAND_SUBTITLE}
            </div>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-2 text-sm font-black sm:flex">
          <Link
            href="/franchise/apply"
            className="rounded-full bg-[#ffc400] px-5 py-3 text-center text-black transition hover:bg-[#ffd84d] focus-ring"
          >
            สมัครแฟรนไชส์
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-black px-5 py-3 text-center text-white transition hover:bg-black/80 focus-ring"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </nav>
    </header>
  );
}

function FoodVisual() {
  return (
    <div className="relative">
      <div className="absolute -left-5 -top-5 h-28 w-28 rounded-full bg-[#ffc400] blur-2xl" />
      <div className="absolute -bottom-6 -right-5 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2.25rem] border-8 border-white bg-black shadow-2xl shadow-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element -- Existing uploaded brand food visual is a static public asset. */}
        <img
          src="/images/AAwebsite.jpg"
          alt="ข้าวเหนียวไก่ทอด เหนียวไก่เยอะโคตร"
          className="h-[22rem] w-full object-cover sm:h-[32rem]"
        />
        <div className="absolute inset-x-4 bottom-4 rounded-[1.5rem] bg-white/92 p-4 backdrop-blur">
          <p className="text-sm font-black text-black/50">
            แฟรนไชส์อาหารพร้อมระบบ
          </p>
          <p className="mt-1 text-2xl font-black text-black">
            ภาพลักษณ์มืออาชีพ เริ่มต้นจากร้านจริง
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-white text-black">
      <PublicHeader />

      <Section className="pb-10 pt-7 sm:pt-10 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-[#ffc400] px-4 py-2 text-sm font-black">
              {BRAND_SUBTITLE}
            </div>
            <h1 className="mt-5 text-4xl font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
              แฟรนไชส์ข้าวเหนียวไก่ทอด สำหรับคนอยากเริ่มต้นขายจริง
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-bold leading-9 text-black/65 sm:text-xl">
              จากร้านข้างทาง สู่ระบบแฟรนไชส์ที่มีสาขาจริง ลูกค้าจริง
              และระบบหลังบ้านจริง
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/franchise/apply" className={primaryButton}>
                สมัครแฟรนไชส์
              </Link>
              <Link href="#franchise-details" className={secondaryButton}>
                ดูรายละเอียดระบบแฟรนไชส์
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-black/10 bg-[#fff9df] px-4 py-2 text-sm font-black text-black/75"
                >
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>
          <FoodVisual />
        </div>
      </Section>

      <Section id="proof" className="bg-[#fff9df] sm:rounded-[3rem]">
        <SectionHeader
          kicker="Proof"
          title="แบรนด์ที่เติบโตจากการขายจริง"
          text="เว็บไซต์สาธารณะถูกยกระดับให้สื่อสารความน่าเชื่อถือแบบแบรนด์แฟรนไชส์ พร้อมข้อมูลที่ผู้สมัครควรรู้ก่อนตัดสินใจ"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {proofCards.map((item, index) => (
            <article
              key={item.title}
              className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-lg shadow-black/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-sm font-black text-[#ffc400]">
                0{index + 1}
              </div>
              <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
              <p className="mt-3 text-sm font-bold leading-7 text-black/60">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="franchise-details">
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="overflow-hidden rounded-[2rem] bg-[#ffc400] p-4 shadow-xl shadow-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- Existing brand imagery from public assets. */}
            <img
              src="/Front%20shop"
              alt="หน้าร้านเหนียวไก่เยอะโคตร"
              className="h-72 w-full rounded-[1.5rem] object-cover"
            />
          </div>
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-black/45">
              Founder
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              สร้างโดยคนที่ลงมือขายจริง
            </h2>
            <p className="mt-5 text-lg font-bold leading-9 text-black/68">
              คมน์ ม่วงคำ ผู้ก่อตั้งแบรนด์เหนียวไก่เยอะโคตร อดีตรับราชการ 27 ปี
              เริ่มต้นธุรกิจจากทุน 4,000 บาท และพัฒนาจากร้านเล็ก ๆ
              ให้เป็นระบบแฟรนไชส์ที่เน้นการลงมือทำจริง
            </p>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-black p-6 text-white sm:p-8">
            <h2 className="text-3xl font-black">เหมาะกับใคร</h2>
            <ul className="mt-6 grid gap-3">
              {fit.map((x) => (
                <li
                  key={x}
                  className="rounded-2xl bg-white/10 p-4 text-lg font-black"
                >
                  ✓ {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] border border-black/10 bg-[#fff9df] p-6 sm:p-8">
            <h2 className="text-3xl font-black">ไม่เหมาะกับใคร</h2>
            <ul className="mt-6 grid gap-3">
              {notFit.map((x) => (
                <li
                  key={x}
                  className="rounded-2xl bg-white p-4 text-lg font-black text-black/70"
                >
                  ! {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeader kicker="Benefits" title="สิ่งที่ได้จากระบบแฟรนไชส์" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item) => (
            <div
              key={item}
              className="rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-xl shadow-black/5"
            >
              <div className="mb-5 h-2 w-16 rounded-full bg-[#ffc400]" />
              <h3 className="text-2xl font-black">{item}</h3>
            </div>
          ))}
        </div>
      </Section>

      <FranchiseModelsSection />

      <Section className="pt-0">
        <div className="overflow-hidden rounded-[2.5rem] bg-black p-8 text-center text-white shadow-2xl shadow-black/20 sm:p-12">
          <h2 className="mx-auto max-w-4xl text-3xl font-black leading-tight sm:text-5xl">
            อยากรู้ว่าแฟรนไชส์นี้เหมาะกับคุณไหม
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-bold leading-8 text-white/70 sm:text-lg">
            กรอกข้อมูลเบื้องต้น ทีมงานจะตรวจสอบทำเล งบลงทุน
            และความพร้อมก่อนติดต่อกลับ
          </p>
          <Link href="/franchise/apply" className={`${primaryButton} mt-8`}>
            ลงทะเบียนผู้สนใจแฟรนไชส์
          </Link>
        </div>
      </Section>

      <footer className="border-t border-black/10 bg-[#fff9df]">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <div className="text-2xl font-black">{BRAND_NAME}</div>
            <div className="mt-1 font-bold text-black/55">{BRAND_SUBTITLE}</div>
          </div>
          <div className="grid gap-2 text-sm font-black sm:grid-cols-2 lg:text-right">
            {contact.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <Link
              href="/login"
              className="underline decoration-2 underline-offset-4"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
