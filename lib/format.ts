export const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

const THAI_TIME_ZONE = "Asia/Bangkok";

function thaiDateParts(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: THAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      if (part.type !== "literal") parts[part.type] = part.value;
      return parts;
    }, {});
}

export function formatThaiDate(date: string | Date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  const parts = thaiDateParts(new Date(date));
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function todayISO() {
  const parts = thaiDateParts();
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function daysAgoISO(days: number) {
  const parts = thaiDateParts();
  const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  date.setDate(date.getDate() - days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function currentMonthStartISO() {
  return `${todayISO().slice(0, 8)}01`;
}
