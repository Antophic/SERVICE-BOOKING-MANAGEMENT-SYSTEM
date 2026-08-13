export function todayDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function addMinutes(time: string, durationMinutes: number) {
  const startMinutes = timeToMinutes(time);
  return startMinutes + durationMinutes;
}

export function timeToMinutes(time: string) {
  const [hourPart, minutePart] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Invalid time value.");
  }

  return hour * 60 + minute;
}

export function bookingsOverlap(
  firstStartTime: string,
  firstDurationMinutes: number,
  secondStartTime: string,
  secondDurationMinutes: number,
) {
  const firstStart = timeToMinutes(firstStartTime);
  const firstEnd = firstStart + firstDurationMinutes;
  const secondStart = timeToMinutes(secondStartTime);
  const secondEnd = secondStart + secondDurationMinutes;

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function isPastBookingDateTime(date: string, time: string, now = new Date()) {
  const candidate = new Date(`${date}T${time}:00`);

  if (Number.isNaN(candidate.getTime())) {
    return true;
  }

  return candidate.getTime() < now.getTime();
}

export function sortBySchedule<T extends { scheduledDate: string; scheduledStartTime: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const dateComparison = left.scheduledDate.localeCompare(right.scheduledDate);
    if (dateComparison !== 0) return dateComparison;
    return left.scheduledStartTime.localeCompare(right.scheduledStartTime);
  });
}
