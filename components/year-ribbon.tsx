import type { Change } from "@/lib/zones";

export type RibbonYear = {
  year: number;
  /** One flag per day: is the clock ahead of standard time that day? */
  ahead: boolean[];
  changes: Change[];
};

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * A year as a strip: standard time in grey, clocks-ahead time in yellow,
 * and a red pin at each change.
 */
export function YearRibbon({ years, today, standardLabel, aheadLabel }: { years: RibbonYear[]; today: string; standardLabel: string; aheadLabel: string }) {
  return (
    <div>
      <div className="space-y-7">
        {years.map(({ year, ahead, changes }) => {
          const runs = runsOf(ahead);
          const days = ahead.length;
          const position = (date: string) => ((dayIndex(date) + 0.5) / days) * 100;

          return (
            <div key={year} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[4.5rem_minmax(0,1fr)]">
              <p className="pt-7 font-mono text-sm font-bold">{year}</p>
              <div>
                <div className="relative h-6">
                  {changes.map((change) => (
                    <span
                      key={change.at}
                      className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-bold text-signal"
                      style={{ left: `${position(change.from.date)}%` }}
                    >
                      {shortShift(change.shift)}
                    </span>
                  ))}
                </div>
                <div className="relative mt-1 flex h-9 overflow-hidden border border-ink">
                  {runs.map((run) => (
                    <span key={run.start} className={run.ahead ? "bg-ahead" : "bg-standard"} style={{ width: `${(run.length / days) * 100}%` }} />
                  ))}
                  {changes.map((change) => (
                    <span key={change.at} className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-signal" style={{ left: `${position(change.from.date)}%` }} />
                  ))}
                  {today.startsWith(`${year}-`) ? (
                    <span className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-ink" style={{ left: `${position(today)}%` }} title="Today" />
                  ) : null}
                </div>
                <div className="mt-1.5 grid grid-cols-12 font-mono text-[10px] text-graphite">
                  {MONTHS.map((month, index) => (
                    <span key={index} className="border-l border-rule pl-1">
                      {month}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-graphite">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-5 border border-ink bg-standard" aria-hidden="true" />
          {standardLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-5 border border-ink bg-ahead" aria-hidden="true" />
          {aheadLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-[3px] bg-ink" aria-hidden="true" />
          Today
        </span>
      </p>
    </div>
  );
}

/** 60 → "+1h", −30 → "−30m", 90 → "+1h30m" */
function shortShift(shift: number): string {
  const size = Math.abs(shift);
  const hours = Math.floor(size / 60);
  const rest = size % 60;

  return `${shift > 0 ? "+" : "−"}${hours ? `${hours}h` : ""}${rest ? `${rest}m` : ""}`;
}

function dayIndex(date: string): number {
  const [year, month, day] = date.split("-").map(Number);

  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000);
}

function runsOf(flags: boolean[]): { start: number; length: number; ahead: boolean }[] {
  const runs: { start: number; length: number; ahead: boolean }[] = [];

  flags.forEach((flag, index) => {
    const last = runs[runs.length - 1];

    if (last && last.ahead === flag) {
      last.length += 1;
    } else {
      runs.push({ start: index, length: 1, ahead: flag });
    }
  });

  return runs;
}
