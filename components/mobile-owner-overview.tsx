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
    <section className="space-y-3 md:hidden" aria-label="สรุปสำหรับเจ้าของร้าน">
      {sections.map((section) => {
        const body = (
          <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl" aria-hidden>{section.icon}</span>
              <h2 className="text-lg font-black text-black">{section.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {section.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl bg-zinc-50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-black/55">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[metric.status ?? "neutral"]}`} />
                    <span>{metric.label}</span>
                  </div>
                  <p className="mt-1 truncate text-lg font-black text-black">{metric.value}</p>
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
