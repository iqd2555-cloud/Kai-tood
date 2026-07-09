import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { ApplyForm } from "./apply-form";

export default async function ApplyPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const success = params?.success === "1";

  return (
    <main className="min-h-dvh bg-white text-black">
      <header className="border-b border-black/10 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-2xl focus-ring"
          >
            <BrandLogo size={54} priority />
            <div className="min-w-0">
              <div className="truncate text-lg font-black">{BRAND_NAME}</div>
              <div className="truncate text-xs font-bold text-black/55">
                {BRAND_SUBTITLE}
              </div>
            </div>
          </Link>
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-black px-4 py-3 text-sm font-black text-white focus-ring"
          >
            เข้าสู่ระบบ
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-[2.25rem] bg-black text-white shadow-2xl shadow-black/20">
            <div className="p-6 sm:p-8">
              <div className="inline-flex rounded-full bg-[#ffc400] px-4 py-2 text-sm font-black text-black">
                ใบสมัครแฟรนไชส์
              </div>
              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
                สมัครแฟรนไชส์เหนียวไก่เยอะโคตร
              </h1>
              <p className="mt-4 text-base font-bold leading-8 text-white/72">
                กรอกข้อมูลเบื้องต้นให้ทีมงานประเมินทำเล งบประมาณ
                และความพร้อมก่อนติดต่อกลับ
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- Existing uploaded brand food visual is a static public asset. */}
            <img
              src="/images/AAwebsite.jpg"
              alt="ข้าวเหนียวไก่ทอด"
              className="h-64 w-full object-cover"
            />
          </div>
        </aside>

        {success ? (
          <section className="rounded-[2rem] border border-black/10 bg-[#fff9df] p-7 text-center shadow-xl shadow-black/5 sm:p-10">
            <h2 className="text-3xl font-black sm:text-5xl">
              ขอบคุณครับ ทีมงานได้รับข้อมูลแล้ว
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg font-bold leading-8 text-black/65">
              เราจะตรวจสอบข้อมูลเบื้องต้น และติดต่อกลับตามเบอร์ที่แจ้งไว้
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex rounded-full bg-[#ffc400] px-7 py-4 font-black text-black shadow-lg shadow-yellow-300/30 focus-ring"
            >
              กลับหน้าแรก
            </Link>
          </section>
        ) : (
          <div>
            <div className="mb-5 rounded-[1.5rem] border border-black/10 bg-[#fff9df] p-5">
              <h2 className="text-2xl font-black">
                เริ่มต้นด้วยข้อมูลที่ชัดเจน
              </h2>
              <p className="mt-2 font-bold leading-7 text-black/60">
                แบบฟอร์มนี้เป็นของแบรนด์โดยตรง ไม่ใช่ Google Form
                และใช้สำหรับประเมินความพร้อมเบื้องต้นเท่านั้น
              </p>
            </div>
            <ApplyForm />
          </div>
        )}
      </section>
    </main>
  );
}
