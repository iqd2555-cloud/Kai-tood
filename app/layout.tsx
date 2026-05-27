import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegistrar } from "@/components/pwa-registrar";

export const metadata: Metadata = {
  title: "Kai Tood Manager",
  description: "ระบบจัดการร้านเหนียวไก่เยอะโคตร",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-192.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kai Tood",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="antialiased">
        {children}
        <PwaRegistrar />
      </body>
    </html>
  );
}
