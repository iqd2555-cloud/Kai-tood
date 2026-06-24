import type { ReactNode } from "react";

export type InsightAlertStatus = "normal" | "warning" | "critical";

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
    chip: "bg-green-700 text-white",
    wrapper: "border-green-300 bg-green-50 text-green-950",
    title: "text-green-900",
    issue: "border-green-200 bg-white/80 text-green-950",
  },
  warning: {
    icon: "⚠️",
    label: "ต้องตรวจสอบ",
    chip: "bg-orange-500 text-white",
    wrapper: "border-orange-300 bg-[#FFF7D6] text-orange-950",
    title: "text-orange-950",
    issue: "border-orange-200 bg-white/85 text-orange-950",
  },
  critical: {
    icon: "🚨",
    label: "ผิดปกติ",
    chip: "bg-[#E60012] text-white",
    wrapper: "border-[#E60012] bg-red-50 text-red-950 shadow-lg shadow-red-900/10",
    title: "text-red-900",
    issue: "border-red-200 bg-white/90 text-red-950",
  },
};

export function InsightAlertBanner({ title, status, summary, issues = [], helperText, className = "" }: InsightAlertBannerProps) {
  const style = STATUS_STYLES[status];

  return (
    <section className={`rounded-3xl border-2 p-4 sm:p-5 ${style.wrapper} ${className}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">
          {style.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-lg font-black leading-snug sm:text-xl ${style.title}`}>{title}</h4>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${style.chip}`}>{style.label}</span>
          </div>
          <p className="mt-1 text-base font-black leading-relaxed sm:text-lg">{summary}</p>
          {helperText ? <p className="mt-1 text-sm font-bold opacity-80">{helperText}</p> : null}
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue) => {
            const issueStatus = issue.status ?? status;
            const issueStyle = STATUS_STYLES[issueStatus];
            return (
              <article key={issue.id} className={`rounded-2xl border p-3 ${issueStyle.issue}`}>
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
