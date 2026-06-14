import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME } from "@/lib/brand";
import { ApplyForm } from "./apply-form";

export default async function ApplyPage({ searchParams }: { searchParams?: Promise<{ success?: string }> }) {
  const params = await searchParams;
  const success = params?.success === "1";
  return (
    <main className="min-h-dvh bg-[#fffdf5] px-4 py-5 text-[#111111]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-5 flex items-center gap-3 rounded-2xl focus-ring"><BrandLogo size={52} priority /><div><div className="font-black">{BRAND_NAME}</div><div className="text-xs font-bold text-black/55">สมัครแฟรนไชส์</div></div></Link>
        {success ? <section className="rounded-[2rem] bg-[#111111] p-7 text-center text-white"><h1 className="text-3xl font-black text-[#ffc400]">ขอบคุณครับ ทีมงานได้รับข้อมูลแล้ว</h1><p className="mt-3 text-lg font-bold">เราจะติดต่อกลับตามเบอร์ที่แจ้งไว้</p><Link href="/" className="mt-6 inline-flex rounded-full bg-[#ffc400] px-6 py-3 font-black text-black">กลับหน้าแรก</Link></section> : <><h1 className="text-3xl font-black">สมัครแฟรนไชส์</h1><p className="mt-2 mb-5 font-bold text-black/60">กรอกข้อมูลสั้น ๆ เพื่อให้ทีมงานติดต่อกลับ</p><ApplyForm /></>}
      </div>
    </main>
  );
}
