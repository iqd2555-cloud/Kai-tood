"use client";

import { useEffect } from "react";

function once(target: EventTarget, event: string, timeout = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`หมดเวลารอ ${event}`)), timeout);
    const done = () => { window.clearTimeout(timer); target.removeEventListener(event, done); resolve(); };
    target.addEventListener(event, done, { once: true });
  });
}

async function frame(video: HTMLVideoElement, time: number) {
  video.currentTime = time;
  await once(video, "seeked");
  const scale = Math.min(1, 720 / Math.max(1, video.videoWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("อ่านภาพไม่ได้");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function extract(videoUrl: string) {
  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.preload = "auto";
  v.muted = true;
  v.playsInline = true;
  v.src = videoUrl;
  await once(v, "loadedmetadata");
  const d = v.duration;
  if (!Number.isFinite(d) || d <= 0 || !v.videoWidth) throw new Error("อ่านข้อมูลวิดีโอไม่ได้");
  const times = [Math.min(0.5, d * 0.1), d * 0.5, Math.max(0, d * 0.9)].map((t) => Math.min(t, Math.max(0, d - 0.05)));
  const frames = [];
  for (const t of times) frames.push(await frame(v, t));
  v.removeAttribute("src");
  v.load();
  return frames;
}

export default function VideoFrameEnhancer() {
  useEffect(() => {
    const articles = Array.from(document.querySelectorAll("article"));
    for (const article of articles) {
      const video = article.querySelector("video") as HTMLVideoElement | null;
      if (!video || article.getAttribute("data-video-ai") === "1") continue;
      const forms = Array.from(article.querySelectorAll("form"));
      const aiForm = forms.find((form) => {
        const text = form.textContent ?? "";
        return text.includes("ให้ AI เขียนใหม่") || text.includes("สร้างแคปชันด้วย AI");
      });
      const id = aiForm?.querySelector('input[name="id"]')?.getAttribute("value") ?? "";
      const button = aiForm?.querySelector("button") as HTMLButtonElement | null;
      if (!aiForm || !button || !id || !video.src) continue;
      article.setAttribute("data-video-ai", "1");
      button.textContent = "ให้ AI ดูคลิปจริงแล้วเขียนแคปชัน";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        if (button.disabled) return;
        const old = button.textContent;
        button.disabled = true;
        button.textContent = "กำลังอ่านต้น–กลาง–ท้ายของคลิป…";
        try {
          const frames = await extract(video.currentSrc || video.src);
          button.textContent = "AI กำลังตรวจข้อเท็จจริง…";
          const response = await fetch("/api/content-caption/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, frames }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "สร้างแคปชันไม่สำเร็จ");
          window.location.reload();
        } catch (e) {
          button.disabled = false;
          button.textContent = old;
          window.alert(e instanceof Error ? e.message : "อ่านคลิปไม่สำเร็จ");
        }
      });
    }
  }, []);
  return null;
}
