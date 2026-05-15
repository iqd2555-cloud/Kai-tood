export const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

export const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

export function formatThaiDate(date: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
