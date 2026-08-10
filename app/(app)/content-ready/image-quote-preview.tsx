"use client";

import { useState } from "react";

type Props = { queueId: string; imageUrl: string; quote: string; rendered?: boolean };

function thaiSegments(text: string) {
  try {
    const segmenter = new Intl.Segmenter("th", { granularity: "word" });
    return Array.from(segmenter.segment(text), (part) => part.segment).filter((part) => part.trim());
  } catch { return text.split(/\s+/).filter(Boolean); }
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const units = thaiSegments(text); const lines: string[] = []; let line = "";
  for (const unit of units) { const next = line ? `${line} ${unit}` : unit; if (ctx.measureText(next).width <= maxWidth || !line) line = next; else { lines.push(line); line = unit; } }
  if (line) lines.push(line); return lines;
}
async function loadImage(url: string) { const image = new Image(); image.crossOrigin = "anonymous"; image.decoding = "async"; image.src = url; await image.decode(); return image; }

export function ImageQuotePreview({ queueId, imageUrl, quote, rendered = false }: Props) {
  const [working, setWorking] = useState(false); const [error, setError] = useState("");
  async function renderAndSave() {
    if (!quote.trim() || working) return; setWorking(true); setError("");
    try {
      const image = await loadImage(imageUrl); const maxEdge = 2160; const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale)); const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("ไม่สามารถสร้างไฟล์รูปได้");
      ctx.drawImage(image, 0, 0, width, height);

      // พื้นหลังแบบไล่เฉดอ่อน ไม่ใช้แถบทึบเต็มความกว้าง
      const gradientTop = Math.round(height * 0.62);
      const gradient = ctx.createLinearGradient(0, gradientTop, 0, height);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.55, "rgba(0,0,0,0.18)");
      gradient.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, gradientTop, width, height - gradientTop);

      const left = Math.round(width * 0.075);
      const maxTextWidth = width * 0.78;
      let fontSize = Math.max(30, Math.round(width * 0.047));
      let lines: string[] = [];
      while (fontSize >= 24) {
        ctx.font = `900 ${fontSize}px Tahoma, Arial, sans-serif`;
        lines = wrapText(ctx, quote.trim(), maxTextWidth);
        if (lines.length <= 3) break;
        fontSize -= 2;
      }

      const lineHeight = fontSize * 1.25;
      const quoteHeight = Math.min(3, lines.length) * lineHeight;
      const baselineBottom = height - Math.round(height * 0.055);
      const startY = baselineBottom - quoteHeight + lineHeight * 0.55;

      // เส้น accent เล็ก ๆ ให้ภาพดูเป็นงานกราฟิก ไม่ใช่ข้อความคาดทึบ
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = Math.max(4, Math.round(width * 0.006));
      ctx.fillStyle = "#e11d2e";
      ctx.fillRect(left, Math.max(gradientTop + 10, startY - fontSize * 0.85), Math.max(6, Math.round(width * 0.009)), quoteHeight + fontSize * 0.35);
      ctx.restore();

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.max(18, Math.round(fontSize * 0.44))}px Tahoma, Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 5;
      ctx.fillText("พ่อค้าแม่ค้าข้างถนน", left + Math.round(width * 0.03), Math.max(gradientTop + 20, startY - fontSize * 0.85), maxTextWidth);

      ctx.font = `900 ${fontSize}px Tahoma, Arial, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.72)";
      ctx.shadowBlur = Math.max(5, Math.round(fontSize * 0.12));
      let y = startY;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, left + Math.round(width * 0.03), y, maxTextWidth); y += lineHeight; }

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((v) => v ? resolve(v) : reject(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")), "image/jpeg", 0.92));
      const body = new FormData(); body.append("queue_id", queueId); body.append("file", new File([blob], "post-ready.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/content-ready/render", { method: "POST", body }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "บันทึกรูปไม่สำเร็จ");
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "สร้างรูปไม่สำเร็จ"); setWorking(false); }
  }
  return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />{!rendered && quote ? <div className="pointer-events-none absolute inset-x-0 bottom-0 pt-28" style={{background:"linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.16) 48%, rgba(0,0,0,.58) 100%)"}}><div className="mx-[7.5%] mb-[5%] flex items-stretch gap-3"><div className="w-1.5 shrink-0 rounded-full bg-red-600 shadow-lg"/><div className="min-w-0 text-left text-white drop-shadow-xl"><div className="mb-1 text-[11px] font-bold tracking-wide text-white/80">พ่อค้าแม่ค้าข้างถนน</div><div className="text-lg font-black leading-snug">{quote}</div></div></div></div> : null}</div>{!rendered ? <button type="button" onClick={renderAndSave} disabled={working || !quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working ? "กำลังสร้างไฟล์รูป..." : "สร้างไฟล์รูปพร้อมโพสต์"}</button> : <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}</div>;
}
