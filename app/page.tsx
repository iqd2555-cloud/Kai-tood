import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

const socialProof = ["มีผู้ติดตามบน TikTok / Facebook จำนวนมาก", "มีผู้เรียนและผู้เปิดร้านจริง", "มีสาขาจริง", "มีระบบหลังบ้านช่วยบริหารสาขา"];
const fit = ["คนอยากเริ่มอาชีพขายอาหาร", "คนมีทำเลหน้าชุมชน โรงเรียน ตลาด โรงงาน", "คนพร้อมลงมือทำจริง", "คนต้องการระบบและแนวทาง ไม่ใช่แค่ซื้ออุปกรณ์"];
const notFit = ["คนที่อยากลงทุนอย่างเดียวแต่ไม่ลงมือ", "คนที่มองแฟรนไชส์แค่เทียบราคา", "คนที่ไม่พร้อมทำตามระบบ"];
const benefits = ["สูตรไก่หมักพร้อมทอด", "ระบบการขาย", "ระบบหลังบ้าน", "แนวทางคำนวณต้นทุน", "การสั่งวัตถุดิบ", "การดูแลหลังเปิดร้าน"];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-6xl px-4 py-10 sm:py-14 ${className}`}>{children}</section>;
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-[#fffdf5] text-[#111111]">
      <section className="relative overflow-hidden bg-[#111111] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,196,0,0.35),transparent_26rem)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:py-16">
          <nav className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 rounded-2xl focus-ring">
              <BrandLogo size={56} priority />
              <div>
                <div className="text-lg font-black text-[#ffc400]">{BRAND_NAME}</div>
                <div className="text-xs font-bold text-white/75">{BRAND_SUBTITLE}</div>
              </div>
            </Link>
            <Link href="/login" className="rounded-full border border-white/20 px-4 py-2 text-sm font-black text-white">เข้าสู่ระบบสาขา</Link>
          </nav>
          <div className="grid gap-8 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-[#ffc400] px-4 py-2 text-sm font-black text-black">เปิดรับผู้สนใจแฟรนไชส์</p>
              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">แฟรนไชส์ข้าวเหนียวไก่ทอด สำหรับคนอยากเริ่มต้นขายจริง</h1>
              <p className="mt-5 max-w-2xl text-lg font-bold leading-8 text-white/78">จากร้านข้างทาง สู่ระบบแฟรนไชส์ที่มีสาขาจริง ลูกค้าจริง และระบบหลังบ้านจริง</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/franchise/apply" className="rounded-full bg-[#ffc400] px-6 py-4 text-center text-lg font-black text-black shadow-lg shadow-[#ffc400]/20">สมัครแฟรนไชส์</Link>
                <Link href="/login" className="rounded-full bg-white px-6 py-4 text-center text-lg font-black text-black">เข้าสู่ระบบสาขา</Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-[#ffc400] p-5 text-black">
                <BrandLogo size={92} className="mx-auto" />
                <h2 className="mt-4 text-center text-3xl font-black">{BRAND_NAME}</h2>
                <p className="mt-2 text-center font-bold">แบรนด์อาหารจริง + ระบบบริหารจริง</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {socialProof.map((item) => <div key={item} className="rounded-3xl border border-black/10 bg-white p-5 font-black shadow-sm">{item}</div>)}
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">เหมาะกับ</h2><ul className="mt-4 space-y-3">{fit.map((x) => <li key={x} className="font-bold">✓ {x}</li>)}</ul></div>
          <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">ไม่เหมาะกับ</h2><ul className="mt-4 space-y-3">{notFit.map((x) => <li key={x} className="font-bold text-black/70">• {x}</li>)}</ul></div>
        </div>
      </Section>

      <Section className="pt-0">
        <h2 className="text-3xl font-black">สิ่งที่แฟรนไชส์ได้รับ</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((item) => <div key={item} className="rounded-3xl bg-[#ffc400] p-5 text-lg font-black">{item}</div>)}</div>
      </Section>

      <Section className="pt-0">
        <div className="rounded-[2rem] bg-[#111111] p-7 text-center text-white sm:p-10">
          <h2 className="text-3xl font-black">สมัครแฟรนไชส์วันนี้</h2>
          <p className="mt-3 font-bold text-white/75">ให้ทีมงานติดต่อกลับ เพื่อประเมินทำเล งบประมาณ และความพร้อมร่วมกัน</p>
          <Link href="/franchise/apply" className="mt-6 inline-flex rounded-full bg-[#ffc400] px-7 py-4 text-lg font-black text-black">สมัครแฟรนไชส์</Link>
        </div>
      </Section>
    </main>
  );
}
