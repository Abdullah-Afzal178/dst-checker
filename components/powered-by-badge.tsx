import { POWERED_BY_URL } from "@/lib/constants";

export function PoweredByBadge({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <a
      href={POWERED_BY_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        "inline-flex items-center gap-2 whitespace-nowrap border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal",
        dark ? "border-board-line text-white/75 hover:border-flap hover:text-flap" : "border-ink bg-card text-ink hover:bg-ink hover:text-paper",
        className ?? "",
      ].join(" ")}
    >
      <span className="inline-block h-2 w-2 bg-signal" aria-hidden="true" />
      Powered by ipgeolocation.io
    </a>
  );
}
