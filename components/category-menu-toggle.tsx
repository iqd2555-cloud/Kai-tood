"use client";

import { useState } from "react";

type CategoryMenuItem = {
  label: string;
  href: string;
  detail: string;
};

export function CategoryMenuToggle({ items }: { items: CategoryMenuItem[] }) {
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#eadfca] bg-[#fff8ed] px-4 py-3 text-left shadow-sm transition hover:border-[#f47b00] hover:bg-[#fff1df] focus-ring"
        aria-expanded={isCategoryMenuOpen}
        aria-controls="category-menu-list"
        onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
      >
        <span className="font-black text-[#151515]">เปิดเมนูหมวดหมู่</span>
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl bg-[#1f1f1f]" aria-hidden="true">
          <span className="h-0.5 w-6 rounded-full bg-[#f6c400]" />
          <span className="h-0.5 w-6 rounded-full bg-[#f6c400]" />
          <span className="h-0.5 w-6 rounded-full bg-[#f6c400]" />
        </span>
      </button>

      <div
        id="category-menu-list"
        className={`grid overflow-hidden transition-all duration-300 ease-out ${isCategoryMenuOpen ? "mt-3 max-h-[32rem] gap-2 opacity-100" : "max-h-0 gap-0 opacity-0"}`}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-[#eadfca] bg-[#fff8ed] p-4 transition hover:border-[#f47b00] hover:bg-[#fff1df] focus-ring"
            onClick={() => setIsCategoryMenuOpen(false)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-[#151515]">{item.label}</span>
              <span className="text-[#f47b00] transition group-hover:translate-x-1">→</span>
            </div>
            <p className="mt-1 text-sm font-bold text-[#666666]">{item.detail}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
