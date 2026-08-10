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
  for (const unit of units) {
    const next = line ? `${line} ${unit}` : unit;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else { lines.push(line); line = unit; }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadImage(url: string) {
  const image = new Image(); image.crossOrigin = "anonymous"; image.decoding = "async"; image.src = url; await image.decode(); return image;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function ImageQuotePreview({ queueId, imageUrl, quote, rendered = false }: Props) {
  const [working, setWorking] = useState(false); const [error, setError] = useState("");

  async function renderAndSave() {
    if (!quote.trim() || working) return;
    setWorking(true); setError("");
    try {
      const image = await loadImage(imageUrl);
      const maxEdge = 2160; const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale)); const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("ไม่สามารถสร้างไฟล์รูปได้");
      ctx.drawImage(image, 0, 0, width, height);

      // Editorial quote card: กล่องขาวโปร่งบางส่วน ไม่คาดทึบเต็มภาพ
      const cardX = Math.round(width * 0.07);
      const cardW = Math.round(width * 0.86);
      const padX = Math.round(width * 0.055);
      const kickerSize = Math.max(17, Math.round(width * 0.025));
      let quoteSize = Math.max(34, Math.round(width * 0.052));
      const maxTextW = cardW - padX * 2;
      let lines: string[] = [];
      while (quoteSize >= 28) {
        ctx.font = `900 ${quoteSize}px Tahoma, Arial, sans-serif`;
        lines = wrapText(ctx, quote.trim(), maxTextW);
        if (lines.length <= 3) break;
        quoteSize -= 2;
      }
      const lineH = quoteSize * 1.28;
      const quoteH = Math.min(lines.length, 3) * lineH;
      const cardH = Math.round(kickerSize * 2.1 + quoteH + height * 0.055);
      const cardY = Math.round(height - cardH - height * 0.055);
      const radius = Math.round(width * 0.035);

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.26)";
      ctx.shadowBlur = Math.round(width * 0.025);
      ctx.shadowOffsetY = Math.round(width * 0.012);
      roundRect(ctx, cardX, cardY, cardW, cardH, radius);
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      ctx.fill();
      ctx.restore();

      roundRect(ctx, cardX, cardY, cardW, cardH, radius);
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = Math.max(1, Math.round(width * 0.002));
      ctx.stroke();

      // Brand accent แบบนิตยสาร
      const accentY = cardY + Math.round(height * 0.028);
      ctx.fillStyle = "#e11d2e";
      roundRect(ctx, cardX + padX, accentY, Math.round(width * 0.09), Math.max(5, Math.round(height * 0.006)), 99);
      ctx.fill();

      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.font = `700 ${kickerSize}px Tahoma, Arial, sans-serif`;
      ctx.fillStyle = "#6b7280";
      const kickerY = accentY + Math.round(height * 0.017);
      ctx.fillText("เรื่องจริงของคนค้าขาย", cardX + padX, kickerY, maxTextW);

      ctx.font = `900 ${quoteSize}px Tahoma, Arial, sans-serif`;
      ctx.fillStyle = "#111111";
      let y = kickerY + kickerSize * 1.65;
      for (const line of lines.slice(0, 3)) {
        ctx.fillText(line, cardX + padX, y, maxTextW);
        y += lineH;
      }

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((v) => v ? resolve(v) : reject(new Error("สร้างไฟล์ JPEG ไม่สำเร็จ")), "image/jpeg", 0.94));
      const body = new FormData(); body.append("queue_id", queueId); body.append("file", new File([blob], "post-ready.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/content-ready/render", { method: "POST", body });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof json.error === "string" ? json.error : "บันทึกรูปไม่สำเร็จ");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างรูปไม่สำเร็จ");
      setWorking(false);
    }
  }

  return <div className="space-y-2">
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <img src={imageUrl} crossOrigin="anonymous" alt="ภาพสำหรับโพสต์" className="max-h-[70vh] w-full object-contain" />
      {!rendered && quote ? <div className="pointer-events-none absolute inset-x-[7%] bottom-[5.5%] rounded-3xl border border-white/70 bg-white/95 px-6 py-5 text-left shadow-2xl">
        <div className="mb-3 h-1.5 w-12 rounded-full bg-red-600" />
        <div className="mb-1 text-[11px] font-bold tracking-wide text-black/45">เรื่องจริงของคนค้าขาย</div>
        <div className="text-xl font-black leading-snug text-black">{quote}</div>
      </div> : null}
    </div>
    {!rendered ? <button type="button" onClick={renderAndSave} disabled={working || !quote.trim()} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-black text-black disabled:opacity-50">{working ? "กำลังสร้างไฟล์รูป..." : "สร้างไฟล์รูปพร้อมโพสต์"}</button> : <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm font-black text-green-800">✓ ไฟล์รูปพร้อมโพสต์แล้ว</div>}
    {error ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</div> : null}
  </div>;
}
