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
      ctx.drawImage(image, 0, 0, width, height); const bandHeight = Math.max(90, Math.round(height * 0.15)); const bandTop = height - bandHeight;
      ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, bandTop, width, bandHeight);
      const maxTextWidth = width * 0.86; let fontSize = Math.max(28, Math.round(width * 0.05)); let lines: string[] = [];
      while (fontSize >= 24) { ctx.font = `900 ${fontSize}px Tahoma, Arial, sans-serif`; lines = wrapText(ctx, quote.trim(), maxTextWidth); const lineHeight = fontSize * 1.22; if (lines.length <= 3 && lines.length * lineHeight <= bandHeight * 0.74) break; fontSize -= 2; }
      ctx.font = `900 ${fontSize}px Tahoma, Arial, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.08));
      const lineHeight = fontSize * 1.22; const totalHeight = lines.length * lineHeight; let y = bandTop + (bandHeight - totalHeight) / 2 + lineHeight / 2;
      for (const line of lines.slice(0, 3)) { ctx.fillText(line, width / 2, y, maxTextWidth); y += lineHeight; }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((v) => v ? resolve(v) : reject(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")), "image/jpeg", 0.92));
      const body = new FormData(); body.append("queue_id", queueId); body.append("file", new File([blob], "post-ready.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/content-ready/render", { method: "POST", body }); const json = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "บันทึกรูปไม่สำเร็จ");
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "สร้างรูปไม่สำเร็จ"); setWorking(false); }
  }
  return <div className="space-y-2"><div className="relative overflow-hidden rounded-2xl bg-black"><img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />{!rendered && quote ? <div className="pointer-events-none absolute inset-x-0 bottom-0 flex min-h-[15%] items-center justify-center bg-black/70 px-5 py-3 text-center text-lg font-black leading-snug text-white drop-shadow">{quote}</div> : null}</div>{!rendered ? <button type="button" onClick={renderAndSave} disabled={working || !quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working ? "กำลังสร้างไฟล์รูป..." : "สร้างไฟล์รูปพร้อมโพสต์"}</button> : <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}{error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}</div>;
}
