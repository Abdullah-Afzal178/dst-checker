import "server-only";

import { changeFromApi, type ApiTransition } from "@/lib/dst";
import { nameFor } from "@/lib/names";
import type { Source } from "@/lib/query";
import { getSessionCache, setSessionCache } from "@/lib/session-cache";
import { zoneCity, type Change } from "@/lib/zones";

const TIMEZONE = "https://api.ipgeolocation.io/v3/timezone";
const TIMEOUT_MS = 10000;
const CACHE_MS = 10 * 60 * 1000;

/** Shown when the visitor's own location can't be worked out (on localhost, say). */
export const FALLBACK_PLACE = "New York";

export type Place = {
  name: string;
  /** Region and country, or the zone name. */
  detail: string;
  /** Where the place came from, which says how exact it is. */
  basis: "search" | "coordinates" | "zone" | "ip" | "fallback";
};

export type ZoneInfo = {
  name: string;
  currentAbbr: string;
  standardAbbr: string;
  standardName: string;
  dstAbbr: string;
  dstName: string;
  isDst: boolean;
  dstExists: boolean;
  /** The API's own dst_start and dst_end. One may be past, the other ahead. */
  start: Change | null;
  end: Change | null;
};

export type Loaded =
  | {
      ok: true;
      place: Place;
      zone: ZoneInfo;
      /** The request and the DST part of the reply, for the developer section. */
      request: string;
      reply: Record<string, unknown>;
      notes: string[];
    }
  | { ok: false; title: string; message: string };

type Lookup = Source | { kind: "ip"; ip: string };

export async function load(sourceIn: Source, visitorIp: string | null): Promise<Loaded> {
  const apiKey = process.env.IPGEOLOCATION_API_KEY;

  if (!apiKey) {
    return { ok: false, title: "No API key", message: "Set IPGEOLOCATION_API_KEY in your .env file to look up time zones." };
  }

  const notes: string[] = [];
  const fallbackNote = `Your location couldn't be worked out from this connection, so this shows ${FALLBACK_PLACE}. Search for your own city above.`;
  let source: Lookup = sourceIn;

  if (source.kind === "visitor") {
    if (visitorIp) {
      source = { kind: "ip", ip: visitorIp };
    } else {
      source = { kind: "place", text: FALLBACK_PLACE };
      notes.push(fallbackNote);
    }
  }

  let result = await lookup(apiKey, source);

  // A visitor address with no location (reserved, or simply unknown): fall back.
  if (!result.ok && source.kind === "ip" && [400, 404, 423].includes(result.status)) {
    source = { kind: "place", text: FALLBACK_PLACE };
    notes.push(fallbackNote);
    result = await lookup(apiKey, source);
  }

  if (!result.ok) {
    return { ok: false, ...result.problem };
  }

  const basis: Place["basis"] = sourceIn.kind === "visitor" ? (source.kind === "ip" ? "ip" : "fallback") : result.value.place.basis;

  return { ok: true, ...result.value, place: { ...result.value.place, basis }, notes };
}

type Found = Omit<Extract<Loaded, { ok: true }>, "ok" | "notes">;
type LookupResult = { ok: true; value: Found } | { ok: false; status: number; problem: { title: string; message: string } };

async function lookup(apiKey: string, source: Lookup): Promise<LookupResult> {
  const params = new URLSearchParams();

  if (source.kind === "place") {
    params.set("location", source.text);
  } else if (source.kind === "coords") {
    params.set("lat", String(source.lat));
    params.set("long", String(source.lon));
  } else if (source.kind === "zone") {
    params.set("tz", source.zone);
  } else if (source.kind === "ip") {
    params.set("ip", source.ip);
  }

  const key = `tz:${params.toString()}`;
  const cached = getSessionCache<Found>(key);

  if (cached) {
    return { ok: true, value: cached };
  }

  try {
    const response = await fetch(`${TIMEZONE}?apiKey=${encodeURIComponent(apiKey)}&${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, status: response.status, problem: await problemFor(response, source) };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const zone = asObject(payload.time_zone);
    const name = text(zone?.name);

    if (!zone || !name) {
      return {
        ok: false,
        status: 502,
        problem: { title: "Unexpected answer", message: "ipgeolocation.io sent back something this tool could not read." },
      };
    }

    const location = asObject(payload.location);
    const city = text(location?.city) || text(location?.locality) || text(location?.state_prov);
    const detail = [text(location?.state_prov), text(location?.country_name)].filter((part) => part && part !== city).join(", ");
    let place: Place;

    if (source.kind === "coords") {
      place = { name: formatCoordinates(source.lat, source.lon), detail: name, basis: "coordinates" };
    } else if (source.kind === "zone" || !city) {
      place = { name: zoneCity(name), detail: name, basis: source.kind === "zone" ? "zone" : "search" };
    } else {
      place = { name: source.kind === "place" ? nameFor(source.text, city) : city, detail, basis: "search" };
    }

    const value: Found = {
      place,
      zone: {
        name,
        currentAbbr: text(zone.current_tz_abbreviation),
        standardAbbr: text(zone.standard_tz_abbreviation),
        standardName: text(zone.standard_tz_full_name),
        dstAbbr: text(zone.dst_tz_abbreviation),
        dstName: text(zone.dst_tz_full_name),
        isDst: zone.is_dst === true,
        dstExists: zone.dst_exists === true,
        start: changeFromApi(asObject(zone.dst_start) as ApiTransition | null),
        end: changeFromApi(asObject(zone.dst_end) as ApiTransition | null),
      },
      // A visitor's own address stays out of the page; the zone gives the same answer.
      request: `${TIMEZONE}?apiKey=YOUR_API_KEY&${source.kind === "ip" ? new URLSearchParams({ tz: name }).toString() : params.toString()}`,
      reply: {
        time_zone: {
          name,
          is_dst: zone.is_dst,
          dst_savings: zone.dst_savings,
          dst_exists: zone.dst_exists,
          dst_start: zone.dst_start,
          dst_end: zone.dst_end,
        },
      },
    };

    setSessionCache(key, value, CACHE_MS);

    return { ok: true, value };
  } catch {
    return {
      ok: false,
      status: 0,
      problem: { title: "No answer", message: "ipgeolocation.io could not be reached in time. Try again in a moment." },
    };
  }
}

async function problemFor(response: Response, source: Lookup) {
  if (response.status === 404 && source.kind === "place") {
    return {
      title: "Place not found",
      message: `No place called “${source.text}” turned up. Try a city name, a city and country (Paris, France), coordinates (48.85, 2.35) or a time zone (Europe/Paris).`,
    };
  }

  if (response.status === 400 && source.kind === "zone") {
    return {
      title: "Unknown time zone",
      message: `“${source.zone}” isn't a time zone the API knows. Zone names look like America/New_York or Europe/London. Or search for a city instead.`,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return { title: "API key refused", message: "ipgeolocation.io refused the API key. Check IPGEOLOCATION_API_KEY in your .env file." };
  }

  if (response.status === 429) {
    return { title: "Too many requests", message: "The API's request limit was reached. Try again in a minute." };
  }

  let detail = "";

  try {
    const body = (await response.json()) as { message?: unknown };
    detail = typeof body.message === "string" ? ` It said: ${body.message}` : "";
  } catch {
    detail = "";
  }

  return { title: "Lookup failed", message: `The time zone lookup failed with status ${response.status}.${detail}` };
}

export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(2)}° ${latitude < 0 ? "S" : "N"}`;
  const lon = `${Math.abs(longitude).toFixed(2)}° ${longitude < 0 ? "W" : "E"}`;

  return `${lat}, ${lon}`;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The visitor's own address, from the proxy headers the host sets. */
export function visitorIp(headerStore: Headers): string | null {
  for (const name of ["cf-connecting-ip", "x-real-ip", "x-vercel-forwarded-for", "x-forwarded-for"]) {
    const ip = headerStore
      .get(name)
      ?.split(",")
      .map((item) => item.trim().replace(/^\[|\]$/g, ""))
      .find((item) => /^[0-9a-f:.]+$/i.test(item) && !isPrivate(item));

    if (ip) {
      return ip;
    }
  }

  return null;
}

/** Loopback and private ranges. Anything else is passed on; the API answers 423 for the rest. */
function isPrivate(ip: string): boolean {
  if (ip.includes(":")) {
    return /^(::1?$|f[cd]|fe[89ab])/i.test(ip);
  }

  const [a, b] = ip.split(".").map(Number);

  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127);
}
