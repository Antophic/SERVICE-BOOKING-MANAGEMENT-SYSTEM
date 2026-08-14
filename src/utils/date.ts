const BUSINESS_TIMEZONE = import.meta.env.VITE_BUSINESS_TIMEZONE ?? "Asia/Jakarta";

function dateParts(now: Date, timeZone = BUSINESS_TIMEZONE) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function todayInputValue() {
  const parts = dateParts(new Date());
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function tomorrowInputValue() {
  return addDays(todayInputValue(), 1);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function isToday(date: string) {
  return date === todayInputValue();
}

export function isFutureDate(date: string) {
  return date > todayInputValue();
}

export function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
