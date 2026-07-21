export function StatCard({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" | "brand" }) {
  const classes = {
    light: "glass-card text-black",
    dark: "glass-dark text-white",
    brand: "bg-gradient-to-br from-[#E60012]/90 to-[#b8000e]/90 text-white border-white/20 backdrop-blur-[18px] shadow-[0_18px_45px_rgba(184,0,14,0.18)]",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 ${classes}`}>
      <div className="text-sm font-bold opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}
