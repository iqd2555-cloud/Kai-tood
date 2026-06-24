import type { ReactNode } from "react";

export type InsightAlertStatus = "normal" | "warning" | "critical" | "missing";

export type InsightAlertIssue = {
  id: string;
  branchName: string;
  message: string;
  status?: InsightAlertStatus;
};

type InsightAlertBannerProps = {
  title: string;
  status: InsightAlertStatus;
  summary: string;
  issues?: InsightAlertIssue[];
  helperText?: string;
  className?: string;
};

const STATUS_STYLES: Record<InsightAlertStatus, { icon: ReactNode; chip: string; wrapper: string; title: string; issue: string; label: string }> = {
  normal: {
    icon: "✅",
    label: "ปกติ",
    chip: "border border-[#86EFAC] bg-[#DFF5E3] text-[#166534]",
    wrapper: "border-[#86EFAC] bg-[#DFF5E3] text-[#166534]",
    title: "text-[#166534]",
    issue: "border-[#86EFAC] bg-white/80 text-[#166534]",
  },
  warning: {
    icon: "⚠️",
    label: "ต้องตรวจสอบ",
    chip: "border border-[#E0A800] bg-[#FFD54A] text-[#111111]",
    wrapper: "border-[#E0A800] bg-[#FFD54A] text-[#111111] shadow-lg shadow-yellow-900/10",
    title: "text-[#111111]",
    issue: "border-[#E0A800] bg-[#FFF3BF] text-[#111111]",
  },
  critical: {
    icon: "🚨",
    label: "ผิดปกติรุนแรง",
    chip: "border border-[#D9363E] bg-[#FF4D4F] text-white",
    wrapper: "border-[#D9363E] bg-[#FF4D4F] text-white shadow-lg shadow-red-900/20",
    title: "text-white",
    issue: "border-[#D9363E] bg-[#FF4D4F] text-white",
  },
  missing: {
    icon: "—",
    label: "ไม่มีรายงาน",
    chip: "border border-[#D1D5DB] bg-[#F3F4F6] text-[#333333]",
    wrapper: "border-[#D1D5DB] bg-[#F3F4F6] text-[#333333]",
    title: "text-[#333333]",
    issue: "border-[#D1D5DB] bg-white/80 text-[#333333]",
  },
};

export function InsightAlertBanner({ title, status, summary, issues = [], helperText, className = "" }: InsightAlertBannerProps) {
  const style = STATUS_STYLES[status];

  return (
    <section className={`rounded-3xl border-2 p-4 shadow-sm sm:p-5 ${style.wrapper} ${className}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-2xl shadow-sm" aria-hidden="true">
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-xl font-black leading-snug sm:text-2xl ${style.title}`}>{title}</h4>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${style.chip}`}>{style.label}</span>
          </div>
          <p className="mt-2 text-base font-black leading-relaxed sm:text-lg">{summary}</p>
          {helperText ? <p className="mt-2 text-sm font-bold opacity-85">{helperText}</p> : null}
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue) => {
            const issueStatus = issue.status ?? status;
            const issueStyle = STATUS_STYLES[issueStatus];
            return (
              <article key={issue.id} className={`rounded-2xl border-2 p-3 ${issueStyle.issue}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5" aria-hidden="true">{issueStyle.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black leading-snug">{issue.branchName}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${issueStyle.chip}`}>{issueStyle.label}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold leading-relaxed">{issue.message}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
