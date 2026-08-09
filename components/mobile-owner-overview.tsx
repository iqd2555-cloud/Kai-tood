type Status = "good" | "watch" | "alert" | "neutral";

type Metric = { label: string; value: string; status?: Status };
type Section = { icon: string; title: string; metrics: Metric[]; href?: string };

const dot: Record<Status, string> = {
  good: "bg-emerald-500",
  watch: "bg-amber-400",
  alert: "bg-red-500",
  neutral: "bg-zinc-300",
};

export function MobileOwnerOverview({ sections }: { sections: Section[] }) {
  return (
    <section className="space-y-4" aria-label="สรุปสำหรับเจ้าของร้าน">
      {sections.map((section) => {
        const body = (
          <div className="rounded-[1.75rem] border border-black/10 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl leading-none" aria-hidden>{section.icon}</span>
              <h2 className="text-xl font-black leading-tight text-black sm:text-2xl">{section.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {section.metrics.map((metric) => (
                <div key={metric.label} className="min-h-[88px] rounded-2xl bg-zinc-50 px-4 py-3.5 sm:min-h-[96px] sm:px-5 sm:py-4">
                  <div className="flex items-start gap-2 text-sm font-bold leading-snug text-black/60 sm:text-base">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${dot[metric.status ?? "neutral"]}`} />
                    <span>{metric.label}</span>
                  </div>
                  <p className="mt-2 break-words text-xl font-black leading-tight text-black sm:text-2xl">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        );
        return section.href ? <a key={section.title} href={section.href} className="block">{body}</a> : <div key={section.title}>{body}</div>;
      })}
    </section>
  );
}
