"use client";

import { useState } from "react";

type CourseReviewCarouselProps = {
  reviews: string[];
};

export function CourseReviewCarousel({ reviews }: CourseReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return null;
  }

  const goToPrevious = () => {
    setActiveIndex((current) => (current === 0 ? totalReviews - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveIndex((current) => (current === totalReviews - 1 ? 0 : current + 1));
  };

  return (
    <div className="mt-5 rounded-[1.75rem] border border-[#eadfca] bg-white p-3 shadow-xl shadow-black/5 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d71920]">Student Reviews</p>
          <p className="mt-1 text-lg font-black text-[#151515]">รีวิวจากผู้เรียน</p>
        </div>
        <div className="rounded-full bg-[#fff1df] px-3 py-1 text-sm font-black text-[#666666]">
          {activeIndex + 1}/{totalReviews}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[1.4rem] bg-[#fff8ed]">
        <div className="flex transition-transform duration-300 ease-out" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {reviews.map((label, index) => (
            <div key={label} className="min-w-full p-2" aria-hidden={activeIndex !== index}>
              <div className="flex min-h-56 items-center justify-center rounded-[1.25rem] border-2 border-dashed border-[#f47b00]/45 bg-white/80 p-5 text-center shadow-inner shadow-black/5 sm:min-h-64 lg:min-h-72">
                <div>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1f1f] text-xl font-black text-[#f6c400]">รูป</div>
                  <p className="text-xl font-black text-[#151515] sm:text-2xl">{label}</p>
                  <p className="mt-2 text-sm font-bold text-[#666666]">กดลูกศรเพื่อดูรีวิวถัดไป</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#1f1f1f] text-2xl font-black text-[#f6c400] shadow-xl shadow-black/20 transition hover:scale-105 focus-ring"
          aria-label="ดูรีวิวก่อนหน้า"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[#1f1f1f] text-2xl font-black text-[#f6c400] shadow-xl shadow-black/20 transition hover:scale-105 focus-ring"
          aria-label="ดูรีวิวถัดไป"
        >
          ›
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2" aria-label="เลือกรีวิว">
        {reviews.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition ${activeIndex === index ? "w-8 bg-[#d71920]" : "w-2.5 bg-[#eadfca] hover:bg-[#f47b00]/60"}`}
            aria-label={`ไปยัง${label}`}
            aria-current={activeIndex === index ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
