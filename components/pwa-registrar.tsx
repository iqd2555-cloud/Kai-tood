"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaVersion = {
  version: string;
  generatedAt?: string;
};

const VERSION_URL = "/pwa-version.json";
const REFRESH_INTERVAL_MS = 60_000;

async function fetchPwaVersion() {
  const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });

  if (!response.ok) throw new Error("Cannot load PWA version");
  return (await response.json()) as PwaVersion;
}

async function clearAppCaches() {
  if (!("caches" in window)) return;

  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("kai-tood-")).map((key) => caches.delete(key)));
}

function getVersionedSwUrl(version: string) {
  return `/sw.js?v=${encodeURIComponent(version)}`;
}

export function PwaRegistrar() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  const registerServiceWorker = useCallback(async (version: string) => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    const swUrl = getVersionedSwUrl(version);
    const registrations = await navigator.serviceWorker.getRegistrations();
    const mismatchedRegistrations = registrations.filter((registration) => {
      const activeUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? "";
      return activeUrl && !activeUrl.endsWith(swUrl);
    });

    if (mismatchedRegistrations.length > 0) {
      await Promise.all(mismatchedRegistrations.map((registration) => registration.unregister()));
      await clearAppCaches();
    }

    const registration = await navigator.serviceWorker.register(swUrl, { updateViaCache: "none" });
    registration.active?.postMessage({ type: "CLEAR_OLD_CACHES" });

    registration.addEventListener("updatefound", () => {
      const nextWorker = registration.installing;
      if (!nextWorker) return;

      nextWorker.addEventListener("statechange", () => {
        if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    });

    await registration.update();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrapPwa = async () => {
      try {
        const versionInfo = await fetchPwaVersion();
        if (cancelled) return;

        await registerServiceWorker(versionInfo.version);
        window.localStorage.setItem("kai-tood-pwa-version", versionInfo.version);
      } catch (error) {
        console.error("PWA registration failed", error);
      }
    };

    const checkForNewVersion = async () => {
      try {
        const versionInfo = await fetchPwaVersion();
        if (cancelled) return;

        const currentVersion = window.localStorage.getItem("kai-tood-pwa-version");
        if (currentVersion && currentVersion !== versionInfo.version) {
          await registerServiceWorker(versionInfo.version);
          setUpdateReady(true);
          return;
        }

        window.localStorage.setItem("kai-tood-pwa-version", versionInfo.version);
      } catch (error) {
        console.error("PWA version check failed", error);
      }
    };

    bootstrapPwa();
    const intervalId = setInterval(checkForNewVersion, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForNewVersion();
    };

    const handleControllerChange = () => setUpdateReady(true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

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
    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [registerServiceWorker]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleRefreshApp = async () => {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    registration?.active?.postMessage({ type: "CLEAR_OLD_CACHES" });
    await clearAppCaches();
    window.location.reload();
  };

  return (
    <>
      {updateReady ? (
        <div className="fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-red-200 bg-black p-4 text-white shadow-2xl">
          <p className="text-base font-black text-red-100">มีเวอร์ชันใหม่พร้อมใช้งาน</p>
          <p className="mt-1 text-sm text-white/80">กดรีเฟรชเพื่อล้างแคชเก่าและโหลดแอปล่าสุด</p>
          <button
            type="button"
            onClick={handleRefreshApp}
            className="mt-3 w-full rounded-xl bg-[#E60012] px-4 py-3 text-base font-black text-white"
          >
            รีเฟรชแอปตอนนี้
          </button>
        </div>
      ) : null}

      {!isStandalone && installPrompt ? (
        <button
          type="button"
          onClick={handleInstall}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-[#E60012] px-4 py-3 text-base font-bold text-white shadow-lg"
        >
          ติดตั้งแอปเหนียวไก่เยอะโคตร
        </button>
      ) : null}

      {!isStandalone && isIos && !showIosGuide ? (
        <button
          type="button"
          onClick={() => setShowIosGuide(true)}
          className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-black px-4 py-3 text-base font-bold text-white shadow-lg"
        >
          วิธีเพิ่มลงหน้าจอหลัก (iPhone)
        </button>
      ) : null}

      {!isStandalone && isIos && showIosGuide ? (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-red-200 bg-white p-4 text-sm text-black shadow-xl">
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
