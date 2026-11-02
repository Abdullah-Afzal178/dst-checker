/**
 * Reads the Timezone API's dst_start and dst_end, picks the next and the
 * last clock change, and answers the questions people ask about them. Pure.
 */

import { addDays, daysBetween } from "@/lib/clock";
import { changeAt, type Change, type Wall } from "@/lib/zones";

/** The shape of time_zone.dst_start and time_zone.dst_end. Empty objects where there is no DST. */
export type ApiTransition = {
  utc_time?: unknown;
  duration?: unknown;
  date_time_before?: unknown;
  date_time_after?: unknown;
};

const STAMP = /^(\d{4})-(\d{2})-(\d{2})\D+(\d{2}):(\d{2})/;

/** "2027-03-14 TIME 07:00" → UTC milliseconds. */
function parseStamp(value: unknown): number | null {
  const match = typeof value === "string" ? STAMP.exec(value.trim()) : null;

  if (!match) {
    return null;
  }

  const [year, month, day, hours, minutes] = match.slice(1).map(Number);

  return Date.UTC(year, month - 1, day, hours, minutes);
}

/** "2027-03-14 TIME 02:00" → a wall-clock reading. */
function parseWall(value: unknown): Wall | null {
  const match = typeof value === "string" ? STAMP.exec(value.trim()) : null;

  return match ? { date: `${match[1]}-${match[2]}-${match[3]}`, minutes: Number(match[4]) * 60 + Number(match[5]) } : null;
}

/** "+1.00H" → 60, "-0.50H" → −30. */
function parseDuration(value: unknown): number | null {
  const match = typeof value === "string" ? /^([+-]?)(\d+(?:\.\d+)?)H$/i.exec(value.trim()) : null;

  if (!match) {
    return null;
  }

  const minutes = Math.round(Number(match[2]) * 60);

  return match[1] === "-" ? -minutes : minutes;
}

/**
 * One API transition as a Change. The offsets come from the wall-clock
 * readings: a clock reading `from` at the UTC instant is on offset
 * (from − utc).
 */
export function changeFromApi(transition: ApiTransition | null | undefined): Change | null {
  if (!transition) {
    return null;
  }

  const at = parseStamp(transition.utc_time);
  const from = parseWall(transition.date_time_before);
  const to = parseWall(transition.date_time_after);
  const shift = parseDuration(transition.duration);

  if (at === null || !from || !to || shift === null || shift === 0) {
    return null;
  }

  const offsetBefore = Math.round((Date.UTC(...ymd(from.date)) + from.minutes * 60000 - at) / 60000);
  const change = changeAt(at, offsetBefore, offsetBefore + shift);

  // Trust it only if it agrees with itself.
  return change.to.date === to.date && change.to.minutes === to.minutes ? change : null;
}

function ymd(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);

  return [year, month - 1, day];
}

/** The earliest change after now, and the latest one at or before it. */
export function pickChanges(candidates: (Change | null)[], now: number): { next: Change | null; last: Change | null } {
  const known = candidates.filter((change): change is Change => change !== null).sort((a, b) => a.at - b.at);

  return {
    next: known.find((change) => change.at > now) ?? null,
    last: [...known].reverse().find((change) => change.at <= now) ?? null,
  };
}

/** How far off a change is, from the place's own calendar: "today", "tomorrow", "in 131 days". */
export function whenFromToday(today: string, date: string): string {
  const days = daysBetween(today, date);

  if (days === 0) {
    return "today";
  }

  if (days === 1) {
    return "tomorrow";
  }

  if (days === -1) {
    return "yesterday";
  }

  if (days < 0) {
    return `${-days} days ago`;
  }

  if (days < 7) {
    return `in ${days} days`;
  }

  if (days < 60) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;

    return `in ${weeks} week${weeks === 1 ? "" : "s"}${rest ? ` and ${rest} day${rest === 1 ? "" : "s"}` : ""}`;
  }

  return `in ${days} days`;
}

/** "forward" or "back". */
export function direction(change: Change): "forward" | "back" {
  return change.shift > 0 ? "forward" : "back";
}

/** "You lose an hour" or "You gain an extra hour", with the real amount. */
export function sleepEffect(change: Change): string {
  const size = Math.abs(change.shift);

  if (change.shift > 0) {
    return `You lose ${size === 60 ? "an hour" : size === 30 ? "half an hour" : `${size} minutes`} of sleep`;
  }

  return `You gain ${size === 60 ? "an extra hour" : size === 30 ? "an extra half hour" : `an extra ${size} minutes`}`;
}

// --- scheduled jobs ----------------------------------------------------------

export type JobVerdict =
  | { kind: "skipped"; date: string }
  | { kind: "twice"; date: string }
  | { kind: "normal"; date: string };

/**
 * What a job set for a local time of day does on the day of a change.
 * Spring forward: times in the gap never happen. Fall back: times in the
 * overlap happen twice.
 */
export function jobOnChange(minutes: number, change: Change): JobVerdict {
  // Everything in minutes from midnight at the start of the `from` date.
  const start = change.from.minutes;
  const end = start + change.shift;
  const [low, high] = start < end ? [start, end] : [end, start];

  for (const candidate of [minutes, minutes - 1440, minutes + 1440]) {
    if (candidate >= low && candidate < high) {
      return { kind: change.shift > 0 ? "skipped" : "twice", date: addDays(change.from.date, Math.floor(candidate / 1440)) };
    }
  }

  return { kind: "normal", date: change.from.date };
}
