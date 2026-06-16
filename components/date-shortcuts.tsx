import Link from "next/link";
import { currentMonthStartISO, daysAgoISO, todayISO } from "@/lib/format";

type DateShortcut = {
  label: string;
  from: string;
  to: string;
};

type DateShortcutsProps = {
  basePath: string;
  branchId?: string | null;
};

function buildHref(basePath: string, shortcut: DateShortcut, branchId?: string | null) {
  const params = new URLSearchParams({ from: shortcut.from, to: shortcut.to });
  if (branchId) params.set("branch_id", branchId);
  return `${basePath}?${params.toString()}`;
}

export function getDateShortcuts(): DateShortcut[] {
  const today = todayISO();
  return [
    { label: "วันนี้", from: today, to: today },
    { label: "เมื่อวาน", from: daysAgoISO(1), to: daysAgoISO(1) },
    { label: "7 วัน", from: daysAgoISO(6), to: today },
    { label: "เดือนนี้", from: currentMonthStartISO(), to: today },
  ];
}

export function DateShortcuts({ basePath, branchId }: DateShortcutsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {getDateShortcuts().map((shortcut) => (
        <Link
          key={shortcut.label}
          href={buildHref(basePath, shortcut, branchId)}
          className="focus-ring rounded-2xl border-2 border-black/10 bg-black px-4 py-3 text-center text-sm font-black text-white shadow-sm hover:bg-[#E60012] hover:text-white"
        >
          {shortcut.label}
        </Link>
      ))}
    </div>
  );
}
