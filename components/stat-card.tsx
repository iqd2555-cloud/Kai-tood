export function StatCard({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" | "brand" }) {
  const classes = {
    light: "bg-white text-black border-black/10",
    dark: "bg-[#111111] text-white border-black",
    brand: "bg-gradient-to-br from-[#E60012] to-[#b8000e] text-white border-[#E60012]",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${classes}`}>
      <div className="text-sm font-bold opacity-70">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}
