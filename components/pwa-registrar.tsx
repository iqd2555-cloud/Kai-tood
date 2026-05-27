"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRegistrar() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js");
    }

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    setIsIos(ios);
    setIsStandalone(standalone);

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (isStandalone) return null;

  return (
    <>
      {installPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-yellow-400 px-4 py-3 text-base font-bold text-black shadow-lg"
        >
          ติดตั้งแอป Kai Tood Manager
        </button>
      ) : null}

      {isIos && !showIosGuide ? (
        <button
          type="button"
          onClick={() => setShowIosGuide(true)}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-black px-4 py-3 text-base font-bold text-white shadow-lg"
        >
          วิธีเพิ่มลงหน้าจอหลัก (iPhone)
        </button>
      ) : null}

      {isIos && showIosGuide ? (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-yellow-400 bg-white p-4 text-sm text-black shadow-xl">
          <p className="font-bold">ติดตั้งบน iPhone</p>
          <p>1) กดปุ่มแชร์ใน Safari</p>
          <p>2) เลือก “Add to Home Screen”</p>
          <p>3) กด Add เพื่อใช้งานแบบเต็มจอ</p>
          <button type="button" className="mt-3 rounded bg-black px-3 py-2 text-white" onClick={() => setShowIosGuide(false)}>
            ปิด
          </button>
        </div>
      ) : null}
    </>
  );
}
