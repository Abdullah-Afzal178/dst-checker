/**
 * Clock times and calendar dates. Pure and timezone-free: every time here is
 * a wall-clock time at the place being looked at, so nothing may pass
 * through the server's own timezone.
 */

export type ClockStyle = "12" | "24";

export const MINUTES_PER_DAY = 1440;

/** Minutes after midnight → "2:00 AM" or "02:00". Wraps past midnight. */
export function formatClock(minutes: number, style: ClockStyle): string {
  const whole = ((Math.floor(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(whole / 60);
  const mins = String(whole % 60).padStart(2, "0");

  if (style === "24") {
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }

  const suffix = hours < 12 ? "AM" : "PM";
  const twelve = hours % 12 === 0 ? 12 : hours % 12;

  return `${twelve}:${mins} ${suffix}`;
}

/** "HH:MM" (24-hour) → minutes after midnight, or null. */
export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours > 23 || minutes > 59 ? null : hours * 60 + minutes;
}

/** 60 → "1 hour", 30 → "30 minutes", 90 → "1 hour 30 minutes". */
export function formatShift(minutes: number): string {
  const total = Math.abs(Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }

  if (rest > 0 || hours === 0) {
    parts.push(`${rest} minute${rest === 1 ? "" : "s"}`);
  }

  return parts.join(" ");
}

/** -300 → "UTC−5", 330 → "UTC+5:30", 0 → "UTC". */
export function formatOffset(minutes: number): string {
  if (minutes === 0) {
    return "UTC";
  }

  const sign = minutes < 0 ? "−" : "+";
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

// --- calendar dates (YYYY-MM-DD) ------------------------------------------

function toUtc(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86400000);
}

/** "Sunday, March 14, 2027" */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtc(iso));
}

/** "Sun, Mar 14", or "Sun, Mar 14, 2027" with the year. */
export function formatShortDate(iso: string, withYear = false): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(toUtc(iso));
}

/** "Sunday" */
export function weekday(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(toUtc(iso));
}
