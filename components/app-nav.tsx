import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function AppNav({ profile }: { profile: Profile }) {
  const isOwner = profile.role === "owner";
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#111111] text-white shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="focus-ring rounded-xl">
          <div className="text-lg font-black text-[#ffc400]">Kai Tood</div>
          <div className="text-xs text-white/70">{isOwner ? "เจ้าของร้าน" : profile.branch?.name ?? "พนักงาน"}</div>
        </Link>
        <nav className="flex items-center gap-2 text-sm font-bold">
          <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/daily">กรอกข้อมูล</Link>
          {isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/reports">รายงาน</Link>}
          {isOwner && <Link className="focus-ring rounded-full bg-white/10 px-3 py-2" href="/orders">สั่งของ</Link>}
          <form action={signOut}>
            <button className="focus-ring rounded-full bg-[#ffc400] px-3 py-2 font-black text-black">ออก</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
