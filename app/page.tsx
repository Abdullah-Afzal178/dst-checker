import { ArrowRight, Search } from "lucide-react";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { PoweredByBadge } from "@/components/powered-by-badge";
import { StationClock } from "@/components/station-clock";
import { YearRibbon, type RibbonYear } from "@/components/year-ribbon";
import { daysBetween, formatClock, formatLongDate, formatOffset, formatShift, formatShortDate, type ClockStyle } from "@/lib/clock";
import { EXAMPLES, SITE_NAME, TIMEZONE_API_URL } from "@/lib/constants";
import { direction, jobOnChange, pickChanges, sleepEffect, whenFromToday } from "@/lib/dst";
import { jobText, pageHref, parseQuery, sourceText, type Query } from "@/lib/query";
import { getSessionCache, setSessionCache } from "@/lib/session-cache";
import { load, visitorIp, type Loaded, type ZoneInfo } from "@/lib/timezone";
import { board, type BoardRow } from "@/lib/world";
import {
  changesBetween,
  changesInYears,
  isKnownZone,
  lastChange,
  nextChange,
  nowIn,
  offsetAt,
  standardOffset,
  type Change,
} from "@/lib/zones";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Found = Extract<Loaded, { ok: true }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const query = parseQuery(await searchParams);
  const loaded = await load(query.source, visitorIp(await headers()));
  const now = Date.now();

  return (
    <div className="min-h-screen">
      <div className="h-1.5 bg-signal" />
      <header className="border-b border-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <a href="/" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
            <span className="grid h-9 w-9 place-items-center bg-signal" aria-hidden="true">
              <span className="relative block h-6 w-6 rounded-full bg-card">
                <span className="absolute left-1/2 top-1 h-2.5 w-0.5 -translate-x-1/2 bg-ink" />
                <span className="absolute left-1/2 top-1/2 h-0.5 w-2 bg-ink" />
              </span>
            </span>
            <span className="text-lg font-extrabold uppercase tracking-tight">{SITE_NAME}</span>
          </a>
          <div className="flex items-center gap-3">
            <nav aria-label="Clock format" className="flex border border-ink text-xs font-semibold">
              {(["12", "24"] as const).map((style) => (
                <a
                  key={style}
                  href={pageHref(query, { clock: style })}
                  aria-current={query.clock === style ? "true" : undefined}
                  className={`whitespace-nowrap px-2.5 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                    query.clock === style ? "bg-ink text-paper" : "bg-card hover:bg-paper"
                  }`}
                >
                  {style}-hour
                </a>
              ))}
            </nav>
            <PoweredByBadge className="hidden sm:inline-flex" />
          </div>
        </div>
      </header>

      <SearchStrip query={query} />

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {query.problems.map((problem) => (
          <p key={problem} className="mt-6 border-l-4 border-signal bg-card px-4 py-3 text-sm">
            {problem}
          </p>
        ))}
        {loaded.ok ? (
          <Report found={loaded} query={query} now={now} />
        ) : (
          <section className="mx-auto mt-12 max-w-2xl border border-ink bg-card p-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight">{loaded.title}</h1>
            <p className="mt-3 text-graphite">{loaded.message}</p>
          </section>
        )}
      </main>

      <WorldBoard query={query} now={now} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Faq now={now} />
      </div>

      <footer className="mt-16 border-t border-ink">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-graphite sm:px-6">
          <p>
            Time zones and clock changes from the{" "}
            <a href={TIMEZONE_API_URL} target="_blank" rel="noreferrer" className="font-semibold text-ink underline decoration-signal underline-offset-4 hover:text-signal">
              ipgeolocation.io Timezone API
            </a>
            , with the full schedule from the IANA time zone database. Open source under the MIT licence.
          </p>
          <PoweredByBadge />
        </div>
      </footer>
    </div>
  );
}

function SearchStrip({ query }: { query: Query }) {
  return (
    <div className="border-b border-ink bg-card">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <form action="/" method="get" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="place" className="sr-only">
            City, coordinates or time zone
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" aria-hidden="true" />
            <input
              id="place"
              name="place"
              type="search"
              defaultValue={sourceText(query.source)}
              placeholder="City, coordinates or time zone (Europe/Paris). Empty for your location."
              maxLength={100}
              autoComplete="off"
              className="h-12 w-full border border-ink bg-paper pl-10 pr-3 text-base placeholder:text-graphite focus:outline-none focus:ring-2 focus:ring-signal"
            />
          </div>
          {query.job !== null ? <input type="hidden" name="job" value={jobText(query.job)} /> : null}
          {query.clock === "24" ? <input type="hidden" name="clock" value="24" /> : null}
          <button
            type="submit"
            className="h-12 bg-signal px-6 font-bold uppercase tracking-wide text-white transition hover:bg-signal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Check
          </button>
        </form>
        <p className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
          <span className="mr-2 text-graphite">Try</span>
          {EXAMPLES.map((example) => (
            <a
              key={example.label}
              href={pageHref(query, example.tz ? { tz: example.tz } : { place: example.place })}
              className="border border-rule bg-paper px-2.5 py-1 font-medium transition hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {example.label}
            </a>
          ))}
        </p>
      </div>
    </div>
  );
}

// --- the answer ----------------------------------------------------------------

function Report({ found, query, now }: { found: Found; query: Query; now: number }) {
  const { place, zone } = found;
  const known = isKnownZone(zone.name);
  const today = known ? nowIn(zone.name, now).date : new Date(now).toISOString().slice(0, 10);
  const fromApi = pickChanges([zone.start, zone.end], now);
  const next = fromApi.next ?? (known ? nextChange(zone.name, now) : null);
  const last = fromApi.last ?? (known ? lastChange(zone.name, now) : null);
  const offsetNow = known ? offsetAt(zone.name, now) : null;
  const year = Number(today.slice(0, 4));

  return (
    <>
      {found.notes.map((note) => (
        <p key={note} className="mt-6 border-l-4 border-ink bg-card px-4 py-3 text-sm">
          {note}
        </p>
      ))}
      <Hero found={found} today={today} next={next} last={last} offsetNow={offsetNow} now={now} clock={query.clock} />

      {known ? <Ribbon zone={zone} year={year} today={today} placeName={place.name} /> : null}

      <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {known ? <Schedule zone={zone} year={year} next={next} now={now} clock={query.clock} placeName={place.name} /> : null}
        <div className="space-y-8">
          <JobCheck query={query} zone={zone} known={known} next={next} now={now} />
          <ApiSample found={found} />
        </div>
      </div>
    </>
  );
}

function Hero({
  found,
  today,
  next,
  last,
  offsetNow,
  now,
  clock,
}: {
  found: Found;
  today: string;
  next: Change | null;
  last: Change | null;
  offsetNow: number | null;
  now: number;
  clock: ClockStyle;
}) {
  const { place, zone } = found;
  const sinceLast = last ? daysBetween(last.from.date, today) : null;
  const recent = last && sinceLast !== null && sinceLast >= 0 && sinceLast <= 14 ? last : null;

  return (
    <section aria-labelledby="answer-heading" className="pt-10 text-center sm:pt-14">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite">
        {[place.basis === "ip" ? "Your location, from your IP address" : place.detail, zone.name].filter((part, index, all) => part && all.indexOf(part) === index).join(" · ")}
      </p>
      <h1 id="answer-heading" className="mx-auto mt-3 max-w-3xl text-balance text-2xl font-bold tracking-tight sm:text-3xl">
        When do the clocks change in {place.name}?
      </h1>

      {recent ? (
        <p className="mx-auto mt-5 inline-block border border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper">
          The clocks went {direction(recent)} {formatShift(recent.shift)} {sinceLast === 0 ? "today" : whenFromToday(today, recent.from.date)}
          {sinceLast === 0 ? `, at ${formatClock(recent.from.minutes, clock)}` : `, on ${formatLongDate(recent.from.date)}`}.
        </p>
      ) : null}

      {next ? (
        <NextChange next={next} zone={zone} today={today} clock={clock} />
      ) : (
        <NoChanges zone={zone} placeName={place.name} last={last} offsetNow={offsetNow} now={now} clock={clock} />
      )}
    </section>
  );
}

function NextChange({ next, zone, today, clock }: { next: Change; zone: ZoneInfo; today: string; clock: ClockStyle }) {
  const [before, after] = abbreviations(zone, next);
  const sameDay = next.from.date === next.to.date;

  return (
    <>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-signal">Next change · {whenFromToday(today, next.from.date)}</p>
      <p className="mt-2 text-balance text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">{formatLongDate(next.from.date)}</p>
      <p className="mx-auto mt-5 max-w-2xl text-balance text-lg sm:text-xl">
        At {formatClock(next.from.minutes, clock)}, clocks go <strong>{direction(next)} {formatShift(next.shift)}</strong> to {formatClock(next.to.minutes, clock)}
        {sameDay ? "" : ` on ${formatLongDate(next.to.date)}`}. <strong>{sleepEffect(next)}.</strong>
      </p>

      <div className="mx-auto mt-10 grid max-w-xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
        <ClockCard minutes={next.from.minutes} label="Before" time={formatClock(next.from.minutes, clock)} zoneLabel={zoneLabel(before, next.offsetBefore)} />
        <ArrowRight className="h-7 w-7 text-signal sm:h-9 sm:w-9" aria-hidden="true" />
        <ClockCard
          minutes={next.to.minutes}
          sweepBy={next.shift}
          label="After"
          time={formatClock(next.to.minutes, clock)}
          zoneLabel={zoneLabel(after, next.offsetAfter)}
        />
      </div>
    </>
  );
}

function NoChanges({
  zone,
  placeName,
  last,
  offsetNow,
  now,
  clock,
}: {
  zone: ZoneInfo;
  placeName: string;
  last: Change | null;
  offsetNow: number | null;
  now: number;
  clock: ClockStyle;
}) {
  const local = offsetNow === null ? null : nowIn(zone.name, now);
  const offset = offsetNow === null ? "" : formatOffset(offsetNow);

  return (
    <>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-signal">No daylight saving time</p>
      <p className="mt-2 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">The clocks don&apos;t change</p>
      <p className="mx-auto mt-5 max-w-2xl text-balance text-lg sm:text-xl">
        {placeName} stays on {[zone.currentAbbr, offset].filter(Boolean).join(", ")} all year.{" "}
        {last
          ? `The clocks last changed on ${formatLongDate(last.from.date)}, when they went ${direction(last)} ${formatShift(last.shift)}.`
          : "Its clocks haven't changed since at least 1970."}
      </p>
      {local ? (
        <div className="mx-auto mt-10 max-w-[13rem]">
          <ClockCard minutes={local.minutes} label="Now" time={formatClock(local.minutes, clock)} zoneLabel={zoneLabel(zone.currentAbbr, offsetNow ?? 0)} />
        </div>
      ) : null}
    </>
  );
}

function ClockCard({ minutes, sweepBy, label, time, zoneLabel }: { minutes: number; sweepBy?: number; label: string; time: string; zoneLabel: string }) {
  return (
    <figure className="m-0">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-graphite">{label}</p>
      <StationClock minutes={minutes} sweepBy={sweepBy} label={`${label}: ${time}`} />
      <figcaption className="mt-3">
        <span className="block font-mono text-lg font-bold sm:text-2xl">{time}</span>
        <span className="mt-0.5 block text-xs text-graphite sm:text-sm">{zoneLabel}</span>
      </figcaption>
    </figure>
  );
}

/** The abbreviations either side of a change, when the API has them. */
function abbreviations(zone: ZoneInfo, change: Change): [string, string] {
  if (!zone.dstExists || !zone.standardAbbr || !zone.dstAbbr) {
    return ["", ""];
  }

  return change.shift > 0 ? [zone.standardAbbr, zone.dstAbbr] : [zone.dstAbbr, zone.standardAbbr];
}

function zoneLabel(abbreviation: string, offset: number): string {
  const utc = formatOffset(offset);

  return abbreviation && abbreviation !== utc && !/^[+-]\d+$/.test(abbreviation) ? `${abbreviation}, ${utc}` : utc;
}

// --- the year and the schedule -----------------------------------------------

function Ribbon({ zone, year, today, placeName }: { zone: ZoneInfo; year: number; today: string; placeName: string }) {
  const years: RibbonYear[] = [year, year + 1].map((y) => {
    const standard = standardOffset(zone.name, y);
    const length = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / DAY_MS;

    return {
      year: y,
      // Local noon each day, near enough: the strip is a pixel or two per day.
      ahead: Array.from({ length }, (_, day) => offsetAt(zone.name, Date.UTC(y, 0, 1 + day, 12) - standard * 60000) > standard),
      changes: changesInYears(zone.name, y, y),
    };
  });

  if (years.every((y) => y.changes.length === 0)) {
    return null;
  }

  const standard = standardOffset(zone.name, year);

  return (
    <section aria-labelledby="year-heading" className="mt-16 border-t border-ink pt-8">
      <SectionTitle id="year-heading" kicker="Two years at a glance">
        Daylight saving time in {placeName}, {year} and {year + 1}
      </SectionTitle>
      <div className="mt-6">
        <YearRibbon
          years={years}
          today={today}
          standardLabel={`Standard time (${zoneLabel(zone.standardAbbr, standard)})`}
          aheadLabel={`Daylight saving time (${zoneLabel(zone.dstAbbr, standard + (years[0].changes.find((c) => c.shift > 0)?.shift ?? 60))})`}
        />
      </div>
    </section>
  );
}

function Schedule({ zone, year, next, now, clock, placeName }: { zone: ZoneInfo; year: number; next: Change | null; now: number; clock: ClockStyle; placeName: string }) {
  const from = year - 1;
  const to = year + 4;
  const changes = changesInYears(zone.name, from, to);
  const years = Array.from({ length: to - from + 1 }, (_, index) => from + index);

  return (
    <section aria-labelledby="schedule-heading">
      <SectionTitle id="schedule-heading" kicker="Timetable">
        Every clock change in {placeName}, {from} to {to}
      </SectionTitle>
      {changes.length === 0 ? (
        <p className="mt-6 border border-rule bg-card p-5 text-graphite">No clock changes in these years.</p>
      ) : (
        <div className="mt-6 overflow-x-auto border border-ink bg-card">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-ink font-mono text-[11px] uppercase tracking-wider text-paper">
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Clocks</th>
                <th scope="col" className="px-4 py-2.5 font-medium">At</th>
                <th scope="col" className="px-4 py-2.5 font-medium">You</th>
              </tr>
            </thead>
            {years.map((y) => {
              const inYear = changes.filter((change) => change.from.date.startsWith(`${y}-`));

              return (
                <tbody key={y}>
                  <tr className="border-t border-ink bg-paper">
                    <th scope="rowgroup" colSpan={4} className="px-4 py-1.5 font-mono text-xs font-bold">
                      {y}
                      {inYear.length === 0 ? <span className="ml-2 font-normal text-graphite">no changes</span> : null}
                    </th>
                  </tr>
                  {inYear.map((change) => {
                    const isNext = next !== null && change.at === next.at;
                    const past = change.at <= now;

                    return (
                      <tr key={change.at} className={`border-t border-rule ${past ? "text-graphite" : ""} ${isNext ? "bg-signal/10" : ""}`}>
                        <td className={`px-4 py-2.5 font-semibold ${isNext ? "border-l-4 border-signal" : "border-l-4 border-transparent"}`}>
                          {formatShortDate(change.from.date)}
                          {isNext ? <span className="ml-2 bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Next</span> : null}
                        </td>
                        <td className="px-4 py-2.5">
                          {direction(change) === "forward" ? "Forward" : "Back"} {formatShift(change.shift)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">
                          {formatClock(change.from.minutes, clock)} → {formatClock(change.to.minutes, clock)}
                        </td>
                        <td className="px-4 py-2.5">{change.shift > 0 ? "Lose" : "Gain"} {formatShift(change.shift)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-graphite">
        Dates for future years follow today&apos;s rules. Governments do change them, sometimes at short notice.
      </p>
    </section>
  );
}

// --- scheduled jobs ------------------------------------------------------------

function JobCheck({ query, zone, known, next, now }: { query: Query; zone: ZoneInfo; known: boolean; next: Change | null; now: number }) {
  const upcoming = known ? changesBetween(zone.name, now, now + 400 * DAY_MS) : next ? [next] : [];
  // The next change each way, soonest first.
  const pair = [upcoming.find((change) => change.shift > 0), upcoming.find((change) => change.shift < 0)]
    .filter((change): change is Change => change !== undefined)
    .sort((a, b) => a.at - b.at);
  const clock = query.clock;

  return (
    <section aria-labelledby="job-heading" className="border border-ink bg-card p-5 sm:p-6">
      <SectionTitle id="job-heading" kicker="For developers">
        Will my scheduled job run?
      </SectionTitle>
      {pair.length === 0 ? (
        <p className="mt-4 text-sm text-graphite">No clock changes are coming up here, so a job set for any local time runs once a day, every day.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2 text-sm">
            {pair.map((change) => (
              <li key={change.at}>
                <strong>{formatShortDate(change.from.date, true)}:</strong>{" "}
                {change.shift > 0
                  ? `${formatClock(change.from.minutes, clock)} to ${formatClock(change.to.minutes - 1, clock)} never happens.`
                  : `${formatClock(change.to.minutes, clock)} to ${formatClock(change.from.minutes - 1, clock)} happens twice.`}
              </li>
            ))}
          </ul>

          <form action="/" method="get" className="mt-5 flex items-end gap-2">
            {query.source.kind === "zone" ? <input type="hidden" name="tz" value={query.source.zone} /> : null}
            {query.source.kind !== "zone" && sourceText(query.source) ? <input type="hidden" name="place" value={sourceText(query.source)} /> : null}
            {query.clock === "24" ? <input type="hidden" name="clock" value="24" /> : null}
            <label className="flex-1 text-sm font-semibold">
              Job runs daily at (local time)
              <input
                type="time"
                name="job"
                required
                defaultValue={query.job === null ? "02:30" : jobText(query.job)}
                className="mt-1.5 block h-11 w-full border border-ink bg-paper px-3 font-mono text-base focus:outline-none focus:ring-2 focus:ring-signal"
              />
            </label>
            <button
              type="submit"
              className="h-11 bg-ink px-5 font-bold uppercase tracking-wide text-paper transition hover:bg-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
            >
              Check
            </button>
          </form>

          {query.job !== null ? (
            <div className="mt-5 space-y-3" aria-live="polite">
              {pair.map((change) => (
                <JobVerdict key={change.at} minutes={query.job!} change={change} clock={clock} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function JobVerdict({ minutes, change, clock }: { minutes: number; change: Change; clock: ClockStyle }) {
  const verdict = jobOnChange(minutes, change);
  const time = formatClock(minutes, clock);
  const date = formatShortDate(verdict.date, true);

  if (verdict.kind === "skipped") {
    return (
      <Verdict tone="bad" title={`${date}: ${time} doesn't exist`}>
        A scheduler that fires on the local clock skips the run. Cron on most Linux systems (cronie, Vixie cron) catches up and runs it just after the jump, at{" "}
        {formatClock(change.to.minutes, clock)}.
      </Verdict>
    );
  }

  if (verdict.kind === "twice") {
    return (
      <Verdict tone="bad" title={`${date}: ${time} happens twice`}>
        A scheduler that fires on the local clock runs it twice, {formatShift(change.shift)} apart. Cron on most Linux systems runs fixed-time jobs once; jobs with a wildcard hour run again.
      </Verdict>
    );
  }

  return (
    <Verdict tone="ok" title={`${date}: runs once, as normal`}>
      But that night the gap between it and the run either side is {formatShift(1440 - change.shift)}, not 24 hours. Anything that assumes a day is 24 hours long, such as a rate
      per day, is off on that date.
    </Verdict>
  );
}

function Verdict({ tone, title, children }: { tone: "ok" | "bad"; title: string; children: ReactNode }) {
  return (
    <div className={`border-l-4 px-4 py-3 ${tone === "bad" ? "border-signal bg-signal/10" : "border-ink bg-paper"}`}>
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-graphite">{children}</p>
    </div>
  );
}

function ApiSample({ found }: { found: Found }) {
  return (
    <section aria-labelledby="api-heading" className="border border-ink bg-board text-white">
      <div className="border-b border-board-line px-5 py-4 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-flap">The API call behind this page</p>
        <h2 id="api-heading" className="mt-1 text-lg font-bold">
          Get these dates in your own code
        </h2>
      </div>
      <pre className="overflow-x-auto px-5 py-4 font-mono text-[11px] leading-relaxed text-white/85 sm:px-6">
        <code>
          <span className="text-flap">GET</span> {found.request}
          {"\n\n"}
          {JSON.stringify(found.reply, null, 2)}
        </code>
      </pre>
      <p className="border-t border-board-line px-5 py-4 text-xs text-white/70 sm:px-6">
        <code className="text-flap">gap: true</code> marks a spring-forward change (an hour that never happens), <code className="text-flap">overlap: true</code> a
        fall-back one (an hour that happens twice). Free on every plan.{" "}
        <a href={TIMEZONE_API_URL} target="_blank" rel="noreferrer" className="font-semibold text-flap underline underline-offset-4 hover:text-white">
          Timezone API docs
        </a>
      </p>
    </section>
  );
}

// --- the world -----------------------------------------------------------------

function WorldBoard({ query, now }: { query: Query; now: number }) {
  // Clock changes don't move within an hour; the board is worked out once per hour.
  const key = `board:${Math.floor(now / 3600000)}`;
  let rows = getSessionCache<BoardRow[]>(key);

  if (!rows) {
    rows = board(now);
    setSessionCache(key, rows, 3600000);
  }

  return (
    <section aria-labelledby="board-heading" className="mt-20 bg-board text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-flap">Departures</p>
        <h2 id="board-heading" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Next clock changes around the world
        </h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-board-line font-mono text-[11px] uppercase tracking-wider text-white/55">
                <th scope="col" className="py-2 pr-4 font-medium">City</th>
                <th scope="col" className="py-2 pr-4 font-medium">Now</th>
                <th scope="col" className="py-2 pr-4 font-medium">Next change</th>
                <th scope="col" className="py-2 pr-4 font-medium">Clocks</th>
                <th scope="col" className="py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {rows.map((row) => {
                const today = nowIn(row.zone, now).date;

                return (
                  <tr key={row.zone} className="border-b border-board-line">
                    <td className="py-3 pr-4">
                      <a href={pageHref(query, { tz: row.zone })} className="font-sans text-base font-bold text-white hover:text-flap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flap">
                        {row.city}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-white/70">{formatOffset(row.offset)}</td>
                    {row.next ? (
                      <>
                        <td className="py-3 pr-4 text-flap">{formatShortDate(row.next.from.date)}</td>
                        <td className="py-3 pr-4">
                          {row.next.shift > 0 ? "▲ Forward" : "▼ Back"} {formatShift(row.next.shift)}
                        </td>
                        <td className="py-3 text-white/70">{whenFromToday(today, row.next.from.date)}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4 text-white/45">No changes</td>
                        <td className="py-3 pr-4 text-white/45">·</td>
                        <td className="py-3 text-white/45">{row.stoppedIn ? `Stopped in ${row.stoppedIn}` : "Same all year"}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// --- questions -----------------------------------------------------------------

function Faq({ now }: { now: number }) {
  // This year's dates until the last change of the year has passed, then next year's.
  const thisYear = Number(new Date(now).toISOString().slice(0, 4));
  const year = changesInYears("America/New_York", thisYear, thisYear).some((change) => change.at > now) ? thisYear : thisYear + 1;
  const us = changesInYears("America/New_York", year, year);
  const uk = changesInYears("Europe/London", year, year);
  const dates = (changes: Change[]) => changes.map((change) => formatLongDate(change.from.date).replace(/, \d{4}$/, "")).join(" and ");

  const items: { q: string; a: ReactNode }[] = [
    {
      q: "Do we gain or lose an hour?",
      a: "In spring the clocks go forward, so you lose an hour: 2:00 AM becomes 3:00 AM and the night is an hour shorter. In autumn they go back and you gain an hour: 2:00 AM becomes 1:00 AM again. “Spring forward, fall back” is the way to remember it.",
    },
    {
      q: `When does the time change in ${year}?`,
      a: `In the United States and Canada, on ${dates(us)}, ${year}, at 2:00 AM local time. In the United Kingdom and the European Union, on ${dates(uk)}, ${year}, at 1:00 AM UTC, which is the same moment everywhere in Europe.`,
    },
    {
      q: "Which US states don't change their clocks?",
      a: "Hawaii and most of Arizona stay on standard time all year, though the Navajo Nation in northeastern Arizona does change. The US territories don't change either: Puerto Rico, the US Virgin Islands, Guam, the Northern Mariana Islands and American Samoa keep the same time all year.",
    },
    {
      q: "Which countries have stopped changing their clocks?",
      a: "Most of the world doesn't use daylight saving time at all, including nearly all of Africa and Asia. Some countries dropped it recently: Brazil in 2019, and Mexico and Iran in 2022. The board above shows when each city last changed.",
    },
    {
      q: "Will my phone change the time on its own?",
      a: "Yes, if it sets the time automatically. Phones, computers and smart watches follow the time zone rules and change at the exact moment. Ovens, car dashboards and older wall clocks don't, so set those by hand.",
    },
    {
      q: "How should software handle clock changes?",
      a: "Store and schedule in UTC, and convert to local time only for display. If a job has to follow local time, keep it out of the hour around the change (usually between midnight and 3:00 AM), or it can be skipped in spring and run twice in autumn.",
    },
  ];

  return (
    <section aria-labelledby="faq-heading" className="mt-16">
      <SectionTitle id="faq-heading" kicker="Questions">
        Daylight saving time, answered
      </SectionTitle>
      <div className="mt-6 grid gap-px border border-ink bg-ink md:grid-cols-2">
        {items.map((item) => (
          <div key={item.q} className="bg-card p-5 sm:p-6">
            <h3 className="font-bold">{item.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-graphite">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ id, kicker, children }: { id: string; kicker: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">{kicker}</p>
      <h2 id={id} className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
        {children}
      </h2>
    </div>
  );
}
