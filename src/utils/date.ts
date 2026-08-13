export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowInputValue() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
