import Link from "next/link";
import { signOut } from "@/app/actions";
import { canUseStaffCounterOrder } from "@/lib/counter-access";
import type { Profile } from "@/lib/types";

export function AppNav({ profile }: { profile: Profile }) {
  const isOwner = profile.role === "owner";
  const staffOrderInputEnabled = canUseStaffCounterOrder(profile);
  const ownerIdentity = profile.email || profile.full_name || "ไม่พบชื่อผู้ใช้";
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#111111] text-white shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/dashboard" className="focus-ring rounded-xl">
            <div className="text-lg font-black text-[#ffc400]">Kai Tood</div>
            <div className="text-xs text-white/70">{isOwner ? "เจ้าของร้าน" : profile.branch?.name ?? "พนักงาน"}</div>
          </Link>
          {isOwner && (
            <div className="max-w-[16rem] truncate rounded-full bg-[#ffc400]/15 px-3 py-1 text-xs font-black text-[#ffc400] sm:max-w-sm">
              เจ้าของร้าน: {ownerIdentity}
            </div>
          )}
        </div>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
          {!isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/daily">กรอกข้อมูล</Link>}
          {isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/owner-dashboard">สรุปภาพรวม</Link>}
          {(isOwner || staffOrderInputEnabled) && <Link className="focus-ring rounded-full bg-[#ffc400] px-3 py-2 text-black" href="/counter-orders">นับออเดอร์</Link>}
          {isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/reports">รายงาน</Link>}
          {isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/orders">สั่งของ</Link>}
          {!isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/my-reports">รายงานของฉัน</Link>}
          <form action={signOut}>
            <button className="focus-ring rounded-full bg-[#ffc400] px-3 py-2 font-black text-black">ออก</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
