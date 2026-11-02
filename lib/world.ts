/**
 * The departures board: the next clock change in cities around the world,
 * soonest first, then the places that stay put. Pure.
 */

import { lastChange, nextChange, offsetAt, type Change } from "@/lib/zones";

export const WORLD = [
  { city: "New York", zone: "America/New_York" },
  { city: "Chicago", zone: "America/Chicago" },
  { city: "Los Angeles", zone: "America/Los_Angeles" },
  { city: "Phoenix", zone: "America/Phoenix" },
  { city: "Mexico City", zone: "America/Mexico_City" },
  { city: "Havana", zone: "America/Havana" },
  { city: "Santiago", zone: "America/Santiago" },
  { city: "São Paulo", zone: "America/Sao_Paulo" },
  { city: "London", zone: "Europe/London" },
  { city: "Paris", zone: "Europe/Paris" },
  { city: "Cairo", zone: "Africa/Cairo" },
  { city: "Casablanca", zone: "Africa/Casablanca" },
  { city: "Jerusalem", zone: "Asia/Jerusalem" },
  { city: "Tehran", zone: "Asia/Tehran" },
  { city: "Delhi", zone: "Asia/Kolkata" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
  { city: "Sydney", zone: "Australia/Sydney" },
  { city: "Lord Howe Island", zone: "Australia/Lord_Howe" },
  { city: "Auckland", zone: "Pacific/Auckland" },
];

export type BoardRow = {
  city: string;
  zone: string;
  offset: number;
  next: Change | null;
  /** For places that stay put: the year they last changed, if since 1970. */
  stoppedIn: number | null;
};

export function board(now: number): BoardRow[] {
  const rows = WORLD.map(({ city, zone }) => {
    const next = nextChange(zone, now);
    const last = next ? null : lastChange(zone, now);

    return {
      city,
      zone,
      offset: offsetAt(zone, now),
      next,
      stoppedIn: last ? Number(last.from.date.slice(0, 4)) : null,
    };
  });

  return rows.sort((a, b) => {
    if (a.next && b.next) {
      return a.next.at - b.next.at || a.city.localeCompare(b.city);
    }

    if (a.next || b.next) {
      return a.next ? -1 : 1;
    }

    return a.offset - b.offset;
  });
}
