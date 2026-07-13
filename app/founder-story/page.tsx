import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { FounderStoryCTA, FounderStorySection, FounderTimeline, founderSections } from "@/components/founder-story";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";

export const metadata: Metadata = {
  title: "เรื่องราวผู้ก่อตั้ง | จากเงิน 4,000 บาท สู่ธุรกิจไก่ทอด",
  description: "เรื่องราวของผู้ก่อตั้งเหนียวไก่เยอะโคตร จากเงินติดตัว 4,000 บาท ขายไก่ทอดต่อเนื่อง 5 ปี ก่อนลาออกจากราชการที่ทำมา 27 ปี เพื่อสร้างธุรกิจอย่างเต็มตัว",
};

export default function FounderStoryPage() {
  return (
    <main className="min-h-dvh bg-[#fff8ed] text-[#151515]">
      <header className="border-b border-[#eadfca] bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring">
            <BrandLogo size={54} priority />
            <div className="min-w-0">
              <div className="truncate text-lg font-black sm:text-2xl">{BRAND_NAME}</div>
              <div className="truncate text-xs font-bold text-[#666666]">{BRAND_SUBTITLE}</div>
            </div>
          </Link>
          <Link href="/franchise/apply" className="shrink-0 rounded-xl bg-[#f47b00] px-4 py-3 text-sm font-black text-white focus-ring">สมัครแฟรนไชส์</Link>
        </nav>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section className="rounded-[2.5rem] bg-[#1f1f1f] p-6 text-white shadow-2xl shadow-black/20 sm:p-10 lg:p-12">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f6c400]">Founder Story</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">เรื่องราวของผู้ก่อตั้ง</h1>
          <p className="mt-5 max-w-4xl text-lg font-bold leading-9 text-white/75 sm:text-2xl">จากเงินติดตัว 4,000 บาท สู่การตัดสินใจลาออกจากราชการที่ทำมา 27 ปี</p>
        </section>

        <FounderTimeline />

        <article className="grid gap-6">
          {founderSections.map((section, index) => (
            <FounderStorySection key={section.title} section={section} index={index} />
          ))}
        </article>

        <FounderStoryCTA />
      </div>
    </main>
  );
}
