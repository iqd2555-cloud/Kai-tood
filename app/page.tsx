import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { FounderStoryPreview } from "@/components/founder-story";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const navItems = [
  { label: "หน้าแรก", href: "/" },
  { label: "จุดเริ่มต้นของร้าน", href: "#brand-origin" },
  { label: "แฟรนไชส์", href: "#franchise-packages" },
  { label: "คอร์สเรียน", href: "#courses-and-book" },
  { label: "รีวิว", href: "#real-reviews" },
  { label: "บทความ", href: "/founder-story" },
  { label: "ติดต่อ", href: "#footer-contact" },
];

const bestSellers = [
  { name: "ไก่ทอดดั้งเดิม", image: "/images/AAwebsite.jpg" },
  { name: "ไก่ทอดพริก", image: "/images/AAwebsite.jpg" },
  { name: "หนังไก่ทอด", image: "/images/AAwebsite.jpg" },
  { name: "เครื่องในทอด", image: "/images/AAwebsite.jpg" },
  { name: "ไก่เขย่า", image: "/images/AAwebsite.jpg" },
];

const brandStrengths = [
  "ขายง่าย ราคาเข้าถึงได้",
  "วัตถุดิบจากครัวกลาง",
  "มีระบบสอนและคู่มือ",
  "ใช้พื้นที่ไม่มาก",
  "มีรูปแบบซุ้มและเคาน์เตอร์",
  "เจ้าของร้านไม่จำเป็นต้องยืนขายเองตลอดเวลาเมื่อระบบลงตัว",
];

const franchisePackages = [
  {
    title: "รูปแบบเคาน์เตอร์",
    price: "55,000 บาท",
    image: "/new-kiosk.png",
    alt: "แฟรนไชส์รูปแบบเคาน์เตอร์ เหนียวไก่เยอะโคตร",
    details: [
      "พื้นที่อย่างต่ำ 2 × 3 เมตร",
      "เหมาะกับพื้นที่ในอาคาร พื้นที่ที่มีหลังคา หน้าร้าน ห้องเช่า ตลาดในร่ม หรือพื้นที่หน้าบ้านที่มีหลังคาคลุม",
      "เหมาะกับผู้เริ่มต้นที่มีพื้นที่จำกัด แต่อยากเริ่มขายจริงแบบเป็นระบบ",
    ],
  },
  {
    title: "รูปแบบซุ้ม",
    price: "99,000 บาท",
    image: "/stand-alone.png",
    alt: "แฟรนไชส์รูปแบบซุ้ม เหนียวไก่เยอะโคตร",
    details: [
      "พื้นที่ประมาณ 3 × 3 เมตร",
      "เหมาะกับคนที่ต้องการหน้าร้านชัดเจน ใช้พื้นที่ประมาณ 3 × 3 เมตร ทำงานคล่องตัวขึ้น",
      "เหมาะกับผู้ที่ต้องการหน้าร้านชัดเจนและพื้นที่ทำงานคล่องตัวขึ้น",
    ],
  },
];

const reviewImages = [
  { src: "/review-Live-course.png", alt: "รีวิวผู้เรียนคอร์สสอนสด รูปที่ 1" },
  { src: "/review-Live-course2.png", alt: "รีวิวผู้เรียนคอร์สสอนสด รูปที่ 2" },
  { src: "/review-Live-course3.png", alt: "รีวิวผู้เรียนคอร์สสอนสด รูปที่ 3" },
];

const courses = [
  {
    title: "คอร์สสอนสด",
    subtitle: "คอร์สสอนสูตรไก่ทอดเงินล้าน",
    image: "/Live_Training_Course.png",
    detail: "เรียนแบบจับมือทำ 2 วันเต็มที่จังหวัดนครสวรรค์ เหมาะสำหรับคนที่ต้องการเรียนรู้จากประสบการณ์จริง เห็นขั้นตอนจริง ลงมือจริง และถามตอบได้แบบใกล้ชิด",
    items: ["สอนแบบจับมือทำ", "เรียนสด 2 วัน", "เรียนที่จังหวัดนครสวรรค์", "ราคา 17,500 บาท"],
  },
  {
    title: "คอร์สออนไลน์",
    subtitle: "คอร์สสอนสูตรไก่ทอดเงินล้าน",
    image: "/online-course.png",
    detail: "เรียนในกลุ่มปิด Facebook รวม 10 สูตรที่แม่ค้าทำขายจริงหน้าร้าน พร้อมสูตรนึ่งข้าวเหนียว เรียนซ้ำได้ไม่จำกัด และเลือกเรียนเวลาไหนก็ได้ตามสะดวก",
    items: ["เรียนในกลุ่มปิด Facebook", "สอน 10 สูตรที่แม่ค้าทำขายจริงหน้าร้าน", "สอนนึ่งข้าวเหนียว", "เรียนซ้ำได้ไม่จำกัด"],
  },
  {
    title: "หนังสือสูตร",
    subtitle: "หนังสือสูตรไก่ทอด 10 สูตร",
    image: "/book.png",
    detail: "รวมสูตรไก่ทอดที่แม่ค้าใช้ทำขายจริงหน้าร้าน พร้อมสูตรนึ่งข้าวเหนียว และแนวทางคำนวณต้นทุนท้ายเล่ม",
    items: ["ไก่ทอดดั้งเดิม", "ไก่ทอดพริก", "หนังไก่ทอด", "เครื่องในทอด", "ไก่เขย่า", "สูตรนึ่งข้าวเหนียว"],
  },
];

const credibility = [
  { value: "4,000", label: "บาท เงินทุนเริ่มต้นของร้าน" },
  { value: "5", label: "ปี จากการขายจริงและพัฒนาระบบ" },
  { value: "27", label: "ปี ประสบการณ์ราชการที่นำมาวางระบบ" },
];

const contact = ["โทร 089-272-2789", "Line: kaikoy", "Facebook: เหนียวไก่เยอะโคตร", "TikTok: เหนียวไก่เยอะโคตร"];

const primaryButton = "inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#d71920] px-6 py-4 text-center text-base font-black text-white shadow-xl shadow-[#d71920]/25 transition hover:-translate-y-0.5 hover:bg-[#b9151b] focus-ring";
const secondaryButton = "inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-black/15 bg-white px-6 py-4 text-center text-base font-black text-[#171717] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#fff4d6] focus-ring";

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={`mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, text, invert = false }: { eyebrow: string; title: string; text?: string; invert?: boolean }) {
  return (
    <div className="mb-8 max-w-3xl">
      <p className={`text-sm font-black tracking-[0.18em] ${invert ? "text-[#f6c400]" : "text-[#d71920]"}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl ${invert ? "text-white" : "text-[#171717]"}`}>{title}</h2>
      {text ? <p className={`mt-4 text-base font-bold leading-8 sm:text-lg ${invert ? "text-white/76" : "text-[#5f5f5f]"}`}>{text}</p> : null}
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#111111]/95 text-white shadow-xl shadow-black/20 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
          <span className="rounded-2xl bg-white p-1"><BrandLogo size={54} priority /></span>
          <span className="min-w-0 text-lg font-black leading-tight sm:text-2xl">{BRAND_NAME}</span>
        </Link>
        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => <Link key={item.label} href={item.href} className="rounded-xl px-3 py-2 text-sm font-black text-white/75 transition hover:bg-white/10 hover:text-white">{item.label}</Link>)}
          <Link href="/franchise/apply" className="ml-2 rounded-2xl bg-[#d71920] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#d71920]/30">สนใจแฟรนไชส์</Link>
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl bg-white text-2xl font-black text-[#171717] focus-ring">☰</summary>
          <div className="absolute right-0 top-14 w-[min(86vw,22rem)] rounded-3xl border border-white/10 bg-[#171717] p-3 shadow-2xl shadow-black/40">
            {navItems.map((item) => <Link key={item.label} href={item.href} className="block rounded-2xl px-4 py-3 text-base font-black text-white/85 hover:bg-white/10">{item.label}</Link>)}
            <Link href="/franchise/apply" className="mt-2 block rounded-2xl bg-[#d71920] px-4 py-4 text-center font-black text-white">สนใจแฟรนไชส์</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="home" className="overflow-hidden bg-[#171717] text-white">
      <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
        <div>
          <p className="inline-flex rounded-full border border-[#f6c400]/40 bg-[#f6c400]/12 px-4 py-2 text-sm font-black text-[#f6c400]">ไก่ทอด ข้าวเหนียว และระบบร้านที่ขายจริง</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">จากร้านข้างถนน สู่ระบบแฟรนไชส์ที่ทำได้จริง</h1>
          <p className="mt-5 max-w-2xl text-lg font-bold leading-9 text-white/78 sm:text-xl">ไก่ทอด ข้าวเหนียว ระบบวัตถุดิบ และแนวทางเปิดร้านที่พัฒนาจากประสบการณ์ขายจริง</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#franchise-packages" className={primaryButton}>ดูแพ็กเกจแฟรนไชส์</a><Link href="/founder-story" className={`${secondaryButton} border-white/20 bg-white text-[#171717]`}>ดูเรื่องราวของเรา</Link></div>
        </div>
        <div className="relative">
          <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#d71920] blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#f6c400] blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white p-3 shadow-2xl shadow-black/40">
            <Image src="/images/AAwebsite.jpg" alt="ไก่ทอดและข้าวเหนียวจริงของร้านเหนียวไก่เยอะโคตร" width={1100} height={900} priority sizes="(min-width: 1024px) 44vw, 100vw" className="h-[22rem] w-full rounded-[1.5rem] object-cover sm:h-[34rem]" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-white text-[#171717]">
      <PublicHeader />
      <HeroSection />

      <Section id="best-sellers">
        <SectionTitle eyebrow="เมนูขายดี" title="เมนูหน้าร้านที่ลูกค้าจำได้" text="ใช้ภาพอาหารจริงในโฟลเดอร์ public เป็นจุดเด่นของการ์ด และคงชื่อเมนูจริงจากข้อมูลเดิม" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {bestSellers.map((item) => <article key={item.name} className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl shadow-black/8"><Image src={item.image} alt={item.name} width={520} height={420} sizes="(min-width: 1024px) 18vw, (min-width: 640px) 45vw, 95vw" className="h-48 w-full object-cover" /><div className="p-5"><h3 className="text-xl font-black">{item.name}</h3></div></article>)}
        </div>
      </Section>

      <section className="bg-[#d71920] text-white"><Section id="brand-strengths"><SectionTitle eyebrow="จุดเด่นของแบรนด์" title="แข็งแรง ชัดเจน พร้อมทำเป็นระบบ" text="แนวทางร้านข้างถนนที่ถูกจัดระเบียบให้เหมาะกับการขยายธุรกิจ" invert /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{brandStrengths.map((item, index) => <div key={item} className="rounded-3xl bg-white p-5 text-[#171717] shadow-xl shadow-black/12"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-sm font-black text-[#f6c400]">{index + 1}</span><p className="mt-4 text-xl font-black leading-8">{item}</p></div>)}</div></Section></section>

      <Section id="franchise-packages">
        <SectionTitle eyebrow="แพ็กเกจแฟรนไชส์" title="เลือกขนาดร้านตามทุน ทำเล และความพร้อม" text="แสดงเฉพาะแพ็กเกจ ราคา และรายละเอียดที่มีอยู่จริงในเว็บไซต์เดิม" />
        <div className="grid gap-6 lg:grid-cols-2">{franchisePackages.map((pack) => <article key={pack.title} className="overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-2xl shadow-black/10"><div className="bg-[#171717] p-6 text-white"><h3 className="text-3xl font-black">{pack.title}</h3><p className="mt-3 text-5xl font-black text-[#f6c400]">{pack.price}</p></div><div className="bg-[#fff4d6] p-4"><Image src={pack.image} alt={pack.alt} width={900} height={760} sizes="(min-width: 1024px) 45vw, 96vw" className="h-[26rem] w-full rounded-3xl bg-white object-contain" /></div><div className="p-6"><ul className="grid gap-3">{pack.details.map((detail) => <li key={detail} className="rounded-2xl border border-black/10 bg-white px-4 py-3 font-bold leading-7 shadow-sm">✓ {detail}</li>)}</ul><Link href="/franchise/apply" className={`${primaryButton} mt-5 w-full`}>สอบถามแพ็กเกจนี้</Link></div></article>)}</div>
      </Section>

      <section className="bg-[#171717]"><Section id="brand-origin"><SectionTitle eyebrow="จุดเริ่มต้นของร้าน" title="เริ่มจากเงินทุน 4,000 บาท แล้วโตจากการทดลองขายจริง" text="เรื่องราวเดิมของเว็บไซต์ถูกนำมาจัดวางใหม่ให้ชัดขึ้น โดยยังยึดข้อมูลจริงจากประสบการณ์หน้าร้าน" invert /><FounderStoryPreview /></Section></section>

      <Section id="real-reviews"><SectionTitle eyebrow="รีวิวผู้เรียนและผู้ซื้อแฟรนไชส์" title="ภาพรีวิวจริงจากไฟล์ของร้าน" text="ไม่แต่งรีวิวใหม่ ใช้ภาพรีวิวที่มีอยู่ในโฟลเดอร์ public เท่านั้น" /><div className="flex gap-4 overflow-x-auto pb-4 snap-x">{reviewImages.map((review) => <article key={review.src} className="min-w-[82vw] snap-center overflow-hidden rounded-3xl border border-black/10 bg-white p-3 shadow-xl shadow-black/10 sm:min-w-[22rem] lg:min-w-0 lg:flex-1"><div className="relative h-[32rem] rounded-2xl bg-[#fff4d6]"><Image src={review.src} alt={review.alt} fill sizes="(min-width: 1024px) 30vw, 82vw" className="object-contain" /></div></article>)}</div></Section>

      <section className="bg-[#fff4d6]"><Section id="courses-and-book"><SectionTitle eyebrow="คอร์สและหนังสือ" title="เริ่มเรียนตามระดับความพร้อม" text="คงรายละเอียดจริงของคอร์สสอนสด คอร์สออนไลน์ และหนังสือสูตร" /><div className="grid gap-5 lg:grid-cols-3">{courses.map((course) => <article key={course.title} className="flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl shadow-black/8"><Image src={course.image} alt={course.title} width={720} height={620} sizes="(min-width: 1024px) 30vw, 96vw" className="h-72 w-full bg-white object-contain" /><div className="flex flex-1 flex-col p-6"><p className="text-sm font-black text-[#d71920]">{course.title}</p><h3 className="mt-2 text-2xl font-black">{course.subtitle}</h3><p className="mt-3 font-bold leading-7 text-[#5f5f5f]">{course.detail}</p><ul className="mt-4 grid gap-2">{course.items.map((item) => <li key={item} className="rounded-xl bg-[#fff4d6] px-3 py-2 text-sm font-black">✓ {item}</li>)}</ul><a href="#footer-contact" className={`${primaryButton} mt-5`}>ดูข้อมูลเพิ่มเติม</a></div></article>)}</div></Section></section>

      <Section id="credibility"><SectionTitle eyebrow="ตัวเลขความน่าเชื่อถือ" title="ใช้เฉพาะตัวเลขที่มีอยู่ในข้อมูลเดิม" text="ไม่มีการสร้างจำนวนสาขา จำนวนผู้เรียน หรือจำนวนผู้เปิดร้านขึ้นใหม่ หากต้องการแสดงตัวเลขเหล่านั้นควรเพิ่มข้อมูลจริงภายหลัง" /><div className="grid gap-4 sm:grid-cols-3">{credibility.map((item) => <div key={item.label} className="rounded-3xl bg-[#171717] p-6 text-white shadow-xl shadow-black/15"><p className="text-5xl font-black text-[#f6c400]">{item.value}</p><p className="mt-3 text-lg font-black leading-8">{item.label}</p></div>)}</div></Section>

      <section className="bg-[#d71920] text-white"><Section id="final-cta"><div className="mx-auto max-w-5xl text-center"><h2 className="text-3xl font-black leading-tight sm:text-5xl">แฟรนไชส์ไม่ใช่แค่การซื้ออุปกรณ์ แต่คือการเลือกระบบที่เหมาะกับทุน ทำเล และความพร้อมของคุณ</h2><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/franchise/apply" className={`${secondaryButton} border-white bg-white`}>ประเมินความพร้อมก่อนลงทุน</Link><a href="#footer-contact" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-white px-6 py-4 text-center text-base font-black text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-[#171717] focus-ring">ติดต่อสอบถาม</a></div></div></Section></section>

      <footer id="footer-contact" className="bg-[#171717] text-white"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1fr_1fr] lg:px-8"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white p-1"><BrandLogo size={58} /></span><div><p className="text-2xl font-black">{BRAND_NAME}</p><p className="font-bold text-white/65">{BRAND_SUBTITLE}</p></div></div><div><h3 className="text-xl font-black text-[#f6c400]">ติดต่อ</h3><div className="mt-3 grid gap-2 font-bold text-white/78">{contact.map((item) => <p key={item}>{item}</p>)}<p>ที่อยู่: จังหวัดนครสวรรค์</p></div></div><div><h3 className="text-xl font-black text-[#f6c400]">เมนูสำคัญ</h3><div className="mt-3 grid grid-cols-2 gap-2">{navItems.map((item) => <Link key={item.label} href={item.href} className="font-bold text-white/78 underline-offset-4 hover:text-white hover:underline">{item.label}</Link>)}<Link href="/login" className="font-bold text-white/78 underline-offset-4 hover:text-white hover:underline">เข้าสู่ระบบ</Link></div></div></div></footer>
    </main>
  );
}
