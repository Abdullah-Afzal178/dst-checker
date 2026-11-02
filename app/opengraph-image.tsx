import { ImageResponse } from "next/og";

import { PAGE_TITLE, SITE_NAME } from "@/lib/constants";

export const alt = PAGE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A station clock face at a given time, drawn with boxes (satori has no SVG transforms on groups). */
function Face({ minutes }: { minutes: number }) {
  const hand = (angle: number, length: number, width: number) => (
    <div
      style={{
        position: "absolute",
        left: 100 - width / 2,
        top: 100 - length,
        width,
        height: length + 18,
        background: "#151515",
        transformOrigin: `${width / 2}px ${length}px`,
        transform: `rotate(${angle}deg)`,
      }}
    />
  );

  return (
    <div style={{ position: "relative", display: "flex", width: 220, height: 220, borderRadius: 110, background: "#fbfaf6", border: "10px solid #151515" }}>
      {hand((minutes / 720) * 360, 50, 12)}
      {hand(minutes * 6, 76, 8)}
      <div style={{ position: "absolute", left: 91, top: 91, width: 18, height: 18, borderRadius: 9, background: "#d42a20" }} />
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f3f0e8", color: "#151515", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", height: 16, background: "#d42a20" }} />
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", padding: "0 72px" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 500 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#d42a20", textTransform: "uppercase" }}>{SITE_NAME}</div>
            <div style={{ display: "flex", marginTop: 18, fontSize: 64, fontWeight: 900, lineHeight: 1.02 }}>When does the time change?</div>
            <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: "#5d5952" }}>Gain or lose an hour, for any place.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Face minutes={120} />
            <div style={{ display: "flex", fontSize: 52, fontWeight: 900, color: "#d42a20" }}>→</div>
            <Face minutes={180} />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
