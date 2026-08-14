import { env } from "../config/env.js";

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  const existing = dateTimeFormatters.get(timeZone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    hour12: false,
  });
  dateTimeFormatters.set(timeZone, formatter);
  return formatter;
}

function partsInTimeZone(date: Date, timeZone: string) {
  const values = Object.fromEntries(formatterFor(timeZone).formatToParts(date).map((part) => [part.type, part.value]));
  const hour = Number(values.hour) === 24 ? 0 : Number(values.hour);

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function parseDateAndTime(date: string, time = "00:00") {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  return { year, month, day, hour, minute };
}

export function isValidCalendarDate(date: string) {
  const parsed = parseDateAndTime(date);
  if (!parsed) return false;

  const normalized = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return (
    normalized.getUTCFullYear() === parsed.year &&
    normalized.getUTCMonth() === parsed.month - 1 &&
    normalized.getUTCDate() === parsed.day
  );
}

function validateDateAndTime(date: string, time = "00:00") {
  const parsed = parseDateAndTime(date, time);
  if (!parsed || !isValidCalendarDate(date)) return null;
  return parsed;
}

function timeZoneOffsetMs(timeZone: string, instant: Date) {
  const parts = partsInTimeZone(instant, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - instant.getTime();
}

export function getBusinessDate(now = new Date(), timeZone = env.BUSINESS_TIMEZONE) {
  const parts = partsInTimeZone(now, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function todayDateString(now = new Date(), timeZone = env.BUSINESS_TIMEZONE) {
  return getBusinessDate(now, timeZone);
}

export function addBusinessDays(date: string, days: number) {
  const parsed = validateDateAndTime(date);
  if (!parsed) throw new Error("Invalid date value.");

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days)).toISOString().slice(0, 10);
}

export function businessDateTimeToInstant(date: string, time: string, timeZone = env.BUSINESS_TIMEZONE) {
  const parsed = validateDateAndTime(date, time);
  if (!parsed) return null;

  const localAsUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day, parsed.hour, parsed.minute);
  let instantMs = localAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    instantMs = localAsUtc - timeZoneOffsetMs(timeZone, new Date(instantMs));
  }

  return new Date(instantMs);
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

export function isPastBookingDateTime(
  date: string,
  time: string,
  now = new Date(),
  timeZone = env.BUSINESS_TIMEZONE,
) {
  const candidate = businessDateTimeToInstant(date, time, timeZone);

  if (!candidate || Number.isNaN(candidate.getTime())) {
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
