"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

export function DashboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("daily_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => router.refresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-800">เชื่อมต่อข้อมูลแบบ Real-time แล้ว</div>;
}
