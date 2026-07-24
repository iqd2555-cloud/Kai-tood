import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND_NAME, BRAND_SUBTITLE } from "@/lib/brand";
import { signOut } from "@/app/actions";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import { canAccessDailyInput, canAccessMarinationByEmail, canAccessMyReport, isMarinationOnlyStaff } from "@/lib/marination-access";
import type { Profile } from "@/lib/types";

export function AppNav({ profile }: { profile: Profile }) {
  const isOwner = profile.role === "owner";
  const staffOrderInputEnabled = canUseStaffCounterOrder(profile);
  const canAccessMarination = canAccessMarinationByEmail(profile.email);
  const marinationOnlyStaff = isMarinationOnlyStaff(profile);
  const canUseDailyInput = canAccessDailyInput(profile);
  const canUseMyReport = canAccessMyReport(profile);
  const homeHref = marinationOnlyStaff ? "/marination" : "/dashboard";
  const ownerIdentity = profile.email || profile.full_name || "ไม่พบชื่อผู้ใช้";
  return (
    <header className="glass-dark sticky top-0 z-20 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={homeHref} className="focus-ring flex items-center gap-3 rounded-xl">
            <BrandLogo size={46} className="rounded-xl" />
            <div className="min-w-0">
              <div className="truncate text-lg font-black leading-tight text-[#E60012]">{BRAND_NAME}</div>
              <div className="truncate text-xs font-bold text-white/80">{BRAND_SUBTITLE}</div>
              <div className="truncate text-xs text-white/60">{isOwner ? "เจ้าของร้าน" : profile.branch?.name ?? "พนักงาน"}</div>
            </div>
          </Link>
          {isOwner && (
            <div className="max-w-[16rem] truncate rounded-full bg-[#E60012]/15 px-3 py-1 text-xs font-black text-[#E60012] sm:max-w-sm">
              เจ้าของร้าน: {ownerIdentity}
            </div>
          )}
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
          {!isOwner && canUseDailyInput && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/daily">กรอกข้อมูล</Link>}
          {isOwner && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/owner-dashboard">สรุปภาพรวม</Link>}
          {!marinationOnlyStaff && (isOwner || staffOrderInputEnabled) && <Link className="focus-ring rounded-full border border-white/15 bg-[#E60012]/90 px-3 py-2 text-white shadow-lg shadow-[#E60012]/20 backdrop-blur-md" href="/counter-orders">นับออเดอร์</Link>}
          {canAccessMarination && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/marination">โรงหมักไก่</Link>}
          {isOwner && <Link className="focus-ring rounded-full border border-white/30 bg-[#FFD43B]/90 px-3 py-2 text-black shadow-lg shadow-[#FFD43B]/20 backdrop-blur-md" href="/cash-flow">Cash Flow</Link>}
          {isOwner && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/reports">รายงาน</Link>}
          {isOwner && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/orders">สั่งของ</Link>}
          {isOwner && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/leads">รายชื่อผู้สนใจแฟรนไชส์</Link>}
          {isOwner && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/mini-applications">ใบสมัคร MINI</Link>}
          {!isOwner && canUseMyReport && <Link className="focus-ring glass-button rounded-full px-3 py-2" href="/my-reports">รายงานของฉัน</Link>}
          <form action={signOut}>
            <button className="focus-ring rounded-full border border-white/15 bg-[#E60012]/90 px-3 py-2 font-black text-white shadow-lg shadow-[#E60012]/20 backdrop-blur-md">ออก</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
