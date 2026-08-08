"use client";

import { useRef, useState } from "react";

type Props = {
  id: string;
  videoUrl: string;
  hasCaption: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

function waitFor(video: HTMLVideoElement, event: string) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`หมดเวลารอ ${event}`)), 15000);
    const done = () => {
      window.clearTimeout(timer);
      video.removeEventListener(event, done);
      resolve();
    };
    video.addEventListener(event, done, { once: true });
  });
}

async function captureFrame(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) > 0.05) {
    video.currentTime = time;
    await waitFor(video, "seeked");
  }
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / Math.max(1, video.videoWidth));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถอ่านภาพจากวิดีโอได้");
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export default function VideoCaptionButton({ id, videoUrl, hasCaption, action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const framesRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function prepareFrames() {
    setBusy(true);
    setError("");
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    try {
      await waitFor(video, "loadedmetadata");
      if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth) {
        throw new Error("อ่านความยาววิดีโอไม่ได้");
      }
      const d = video.duration;
      const times = [Math.min(0.5, d * 0.1), d * 0.5, Math.max(0, d * 0.9)];
      const frames: string[] = [];
      for (const time of times) frames.push(await captureFrame(video, Math.min(time, Math.max(0, d - 0.05))));
      if (framesRef.current) framesRef.current.value = JSON.stringify(frames);
      formRef.current?.requestSubmit();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "อ่านเฟรมวิดีโอไม่สำเร็จ");
    } finally {
      video.removeAttribute("src");
      video.load();
    }
  }

  return <form ref={formRef} action={action}>
    <input type="hidden" name="id" value={id} />
    <input ref={framesRef} type="hidden" name="frames" />
    <button type="button" disabled={busy} onClick={prepareFrames} className="w-full rounded-2xl border border-black/15 bg-white px-4 py-3 font-black disabled:opacity-50">
      {busy ? "กำลังอ่านต้น–กลาง–ท้ายของคลิป…" : hasCaption ? "ให้ AI ดูคลิปจริงแล้วเขียนใหม่" : "ให้ AI ดูคลิปจริงแล้วสร้างแคปชัน"}
    </button>
    {error ? <p className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
  </form>;
}
