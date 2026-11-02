/**
 * The page's URL parameters, so every view is a shareable link. Pure.
 */

import { parseTimeOfDay, type ClockStyle } from "@/lib/clock";

export type Source =
  | { kind: "place"; text: string }
  | { kind: "coords"; lat: number; lon: number }
  | { kind: "zone"; zone: string }
  | { kind: "visitor" };

export type Query = {
  source: Source;
  /** A scheduled job's local time of day, in minutes, to check against the changes. */
  job: number | null;
  clock: ClockStyle;
  problems: string[];
};

export const MAX_PLACE = 100;

type Params = Record<string, string | string[] | undefined>;

function single(params: Params, key: string): string {
  const value = params[key];

  return ((Array.isArray(value) ? value[0] : value) ?? "").trim().replace(/\s+/g, " ");
}

/** "America/New_York", "Europe/London", "UTC". Validated against the API, not here. */
const ZONE_NAME = /^(?:[A-Za-z][A-Za-z0-9_+-]*\/[A-Za-z0-9_+\/-]+|UTC|GMT|Etc\/[A-Za-z0-9+-]+)$/;

export function looksLikeZone(text: string): boolean {
  return text.length <= 64 && ZONE_NAME.test(text);
}

/** A typed search: a zone name, coordinates, or a place name to geocode. */
export function sourceFromText(text: string): Source | null {
  if (text === "") {
    return null;
  }

  if (looksLikeZone(text)) {
    return { kind: "zone", zone: text };
  }

  const coords = parseCoordinates(text);

  if (coords) {
    return { kind: "coords", ...coords };
  }

  return text.length <= MAX_PLACE ? { kind: "place", text } : null;
}

export function parseQuery(params: Params): Query {
  const problems: string[] = [];
  const lat = single(params, "lat");
  const lon = single(params, "lon");
  const tz = single(params, "tz");
  const place = single(params, "place");
  let source: Source = { kind: "visitor" };

  if (tz !== "") {
    if (looksLikeZone(tz)) {
      source = { kind: "zone", zone: tz };
    } else {
      problems.push(`“${tz.slice(0, 40)}” isn't a time zone name like America/New_York, so this shows your own location instead.`);
    }
  } else if (lat !== "" || lon !== "") {
    const coords = parseCoordinates(`${lat}, ${lon}`);

    if (coords) {
      source = { kind: "coords", ...coords };
    } else {
      problems.push("Those coordinates are out of range, so this shows your own location instead.");
    }
  } else if (place !== "") {
    const parsed = sourceFromText(place);

    if (parsed) {
      source = parsed;
    } else {
      problems.push("That place name is too long to look up.");
    }
  }

  const jobText = single(params, "job");
  const job = jobText === "" ? null : parseTimeOfDay(jobText);

  if (jobText !== "" && job === null) {
    problems.push("The job time should be a 24-hour time such as 02:30.");
  }

  return { source, job, clock: single(params, "clock") === "24" ? "24" : "12", problems };
}

const COORDINATES =
  /^\s*([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])?\s*(?:,\s*|\s+)([+-]?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i;

/** "48.8566, 2.3522", "48.8566 2.3522" or "40.7128° N, 74.0060° W". */
export function parseCoordinates(text: string): { lat: number; lon: number } | null {
  const match = COORDINATES.exec(text);

  if (!match) {
    return null;
  }

  let lat = Number(match[1]);
  let lon = Number(match[3]);
  const latHemisphere = match[2]?.toUpperCase();
  const lonHemisphere = match[4]?.toUpperCase();

  // A hemisphere letter and a minus sign together are ambiguous.
  if ((latHemisphere && match[1].startsWith("-")) || (lonHemisphere && match[3].startsWith("-"))) {
    return null;
  }

  if (latHemisphere === "S") {
    lat = -lat;
  }

  if (lonHemisphere === "W") {
    lon = -lon;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }

  return { lat, lon };
}

export function sourceText(source: Source): string {
  switch (source.kind) {
    case "place":
      return source.text;
    case "coords":
      return `${source.lat}, ${source.lon}`;
    case "zone":
      return source.zone;
    default:
      return "";
  }
}

type Change = Partial<Record<"place" | "tz" | "job" | "clock", string | null>>;

/** A link to this page with some parameters changed. Empty values are dropped. */
export function pageHref(query: Query, changes: Change): string {
  const params = new URLSearchParams();
  const movesPlace = "place" in changes || "tz" in changes;
  const current = query.source.kind === "zone" ? { tz: query.source.zone, place: "" } : { tz: "", place: sourceText(query.source) };
  const place = movesPlace ? (changes.place ?? "") : current.place;
  const tz = movesPlace ? (changes.tz ?? "") : current.tz;
  const job = "job" in changes ? (changes.job ?? "") : query.job === null ? "" : jobText(query.job);
  const clock = "clock" in changes ? (changes.clock ?? "") : query.clock;

  if (tz) {
    params.set("tz", tz);
  } else if (place) {
    params.set("place", place);
  }

  if (job) {
    params.set("job", job);
  }

  if (clock === "24") {
    params.set("clock", "24");
  }

  const text = params.toString();

  return text ? `/?${text}` : "/";
}

/** 150 → "02:30" */
export function jobText(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
