/**
 * Clock changes worked out from the IANA time zone database that ships with
 * the JavaScript runtime. Pure: every function takes the instant it needs.
 *
 * A change is found by stepping through time and watching the zone's UTC
 * offset, then narrowing each jump down to the exact minute.
 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** A wall-clock reading: a local calendar date and minutes after midnight. */
export type Wall = { date: string; minutes: number };

/** One clock change: the instant, and what the clocks read either side of it. */
export type Change = {
  /** UTC milliseconds. */
  at: number;
  /** Minutes the clocks move: +60 forward, −60 back. */
  shift: number;
  /** UTC offsets in minutes before and after. */
  offsetBefore: number;
  offsetAfter: number;
  /** The clock reading the change happens at ("2:00 AM")... */
  from: Wall;
  /** ...and the reading it jumps to ("3:00 AM"). */
  to: Wall;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let format = formatters.get(zone);

  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
    formatters.set(zone, format);
  }

  return format;
}

/** True for any zone name the runtime knows, legacy spellings included. */
export function isKnownZone(zone: string): boolean {
  if (!zone) {
    return false;
  }

  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}

/** The zone's UTC offset at an instant, in minutes ("GMT-05:00" → −300). */
export function offsetAt(zone: string, ms: number): number {
  const name = formatter(zone)
    .formatToParts(ms)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? "");

  if (!match) {
    return 0;
  }

  const minutes = Number(match[2]) * 60 + Number(match[3]);

  return match[1] === "-" ? -minutes : minutes;
}

/** What a clock on a given offset reads at a UTC instant. */
export function wallAt(ms: number, offset: number): Wall {
  const local = new Date(ms + offset * MINUTE_MS);

  return {
    date: local.toISOString().slice(0, 10),
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/** The local calendar date and time in a zone, right now. */
export function nowIn(zone: string, ms: number): Wall {
  return wallAt(ms, offsetAt(zone, ms));
}

export function changeAt(at: number, offsetBefore: number, offsetAfter: number): Change {
  return {
    at,
    shift: offsetAfter - offsetBefore,
    offsetBefore,
    offsetAfter,
    from: wallAt(at, offsetBefore),
    to: wallAt(at, offsetAfter),
  };
}

/**
 * Every change between two instants, in order. Steps a day at a time (or
 * `stepDays`), so two changes less than a step apart would be missed; no
 * real zone has those within a day.
 */
export function changesBetween(zone: string, startMs: number, endMs: number, stepDays = 1): Change[] {
  const step = stepDays * DAY_MS;
  const changes: Change[] = [];
  let t = Math.floor(startMs / MINUTE_MS) * MINUTE_MS;
  let offset = offsetAt(zone, t);

  while (t < endMs) {
    const next = Math.min(t + step, Math.ceil(endMs / MINUTE_MS) * MINUTE_MS);
    const nextOffset = offsetAt(zone, next);

    if (nextOffset !== offset) {
      // Narrow down to the first minute on the new offset.
      let lo = t;
      let hi = next;

      while (hi - lo > MINUTE_MS) {
        const mid = lo + Math.floor((hi - lo) / 2 / MINUTE_MS) * MINUTE_MS;

        if (offsetAt(zone, mid) === offset) {
          lo = mid;
        } else {
          hi = mid;
        }
      }

      changes.push(changeAt(hi, offset, offsetAt(zone, hi)));
    }

    t = next;
    offset = nextOffset;
  }

  return changes;
}

/** The next change after an instant, looking up to `days` ahead. */
export function nextChange(zone: string, ms: number, days = 400): Change | null {
  return changesBetween(zone, ms + 1, ms + days * DAY_MS)[0] ?? null;
}

/**
 * The most recent change before an instant, searching back as far as 1970
 * a year at a time, a week per step.
 */
export function lastChange(zone: string, ms: number, sinceYear = 1970): Change | null {
  let end = ms;
  const floor = Date.UTC(sinceYear, 0, 1);

  while (end > floor) {
    const start = Math.max(floor, end - 366 * DAY_MS);
    const found = changesBetween(zone, start, end, 7);

    if (found.length > 0) {
      return found[found.length - 1];
    }

    end = start;
  }

  return null;
}

/** All changes in calendar years `from` to `to`, in the zone's own local years. */
export function changesInYears(zone: string, from: number, to: number): Change[] {
  // A day either side, so a change just after local midnight on Jan 1 is kept.
  const changes = changesBetween(zone, Date.UTC(from, 0, 1) - DAY_MS, Date.UTC(to + 1, 0, 1) + DAY_MS);

  return changes.filter((change) => {
    const year = Number(change.from.date.slice(0, 4));

    return year >= from && year <= to;
  });
}

/**
 * The zone's lowest offset in a year: its standard time, for zones that move
 * ahead for part of the year. Sampled weekly, so a month-long change
 * (Morocco's, during Ramadan) is not missed.
 */
export function standardOffset(zone: string, year: number): number {
  const offsets = Array.from({ length: 53 }, (_, week) => offsetAt(zone, Date.UTC(year, 0, 1 + week * 7, 12)));

  return Math.min(...offsets);
}

/** "America/New_York" → "New York", "Australia/Lord_Howe" → "Lord Howe". */
export function zoneCity(zone: string): string {
  const last = zone.split("/").pop() ?? zone;

  return last.replace(/_/g, " ");
}
