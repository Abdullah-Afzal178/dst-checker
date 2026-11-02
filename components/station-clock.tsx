import type { CSSProperties } from "react";

/**
 * A railway station clock face showing a wall-clock time. With `sweepBy`,
 * the hands sweep that many minutes into this time when the page loads
 * (backwards when negative), so the second clock shows the jump.
 */
export function StationClock({ minutes, sweepBy = 0, label }: { minutes: number; sweepBy?: number; label: string }) {
  const start = minutes - sweepBy;
  const hours = { "--from": `${(start / 720) * 360}deg`, "--to": `${(minutes / 720) * 360}deg` } as CSSProperties;
  const mins = { "--from": `${start * 6}deg`, "--to": `${minutes * 6}deg` } as CSSProperties;
  const hand = sweepBy === 0 ? "clock-hand" : "clock-hand clock-hand-swing";

  return (
    <svg viewBox="0 0 200 200" className="h-auto w-full" role="img" aria-label={label}>
      <circle cx="100" cy="100" r="97" fill="#151515" />
      <circle cx="100" cy="100" r="90" fill="#fbfaf6" />

      {Array.from({ length: 60 }, (_, tick) => {
        const hour = tick % 5 === 0;

        return (
          <rect
            key={tick}
            x={hour ? 96.5 : 98.8}
            y="15"
            width={hour ? 7 : 2.4}
            height={hour ? 22 : 7}
            fill="#151515"
            transform={`rotate(${tick * 6} 100 100)`}
          />
        );
      })}

      <g className={hand} style={hours}>
        <polygon points="95,118 105,118 103.5,48 96.5,48" fill="#151515" />
      </g>
      <g className={hand} style={mins}>
        <polygon points="96,122 104,122 102.5,22 97.5,22" fill="#151515" />
      </g>

      {/* The red seconds hand rests at twelve: the instant of the change. */}
      <rect x="99" y="34" width="2" height="94" fill="#d42a20" />
      <circle cx="100" cy="36" r="8.5" fill="#d42a20" />
      <circle cx="100" cy="100" r="3.2" fill="#d42a20" />
    </svg>
  );
}
