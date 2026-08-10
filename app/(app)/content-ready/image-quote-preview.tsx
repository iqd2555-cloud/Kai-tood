"use client";

export function ImageQuotePreview({ imageUrl, quote }: { imageUrl: string; quote: string }) {
  return <div className="relative overflow-hidden rounded-2xl bg-black">
    <img src={imageUrl} alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />
    {quote ? <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-5 pt-12 text-center text-lg font-black leading-snug text-white drop-shadow">{quote}</div> : null}
  </div>;
}
