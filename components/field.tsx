export function NumberField({ label, name, defaultValue = 0, step = "0.01" }: { label: string; name: string; defaultValue?: number; step?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-black">{label}</span>
      <input
        className="focus-ring min-h-14 w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-xl font-bold shadow-sm"
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        name={name}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function TextAreaField({ label, name, defaultValue = "", placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-black text-black">{label}</span>
      <textarea
        className="focus-ring min-h-28 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-lg font-semibold shadow-sm"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
    </label>
  );
}
