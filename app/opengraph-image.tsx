import { ImageResponse } from "next/og";

/** Rendered once at build time so the export stays a pile of static files. */
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "actuallyfreeqr — free QR codes with no sign-up, no email and no tracking";

const PILLS = ["No sign-up", "No email", "No tracking", "No expiry"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f6f5f1",
          color: "#0e0e0d",
          padding: "68px 76px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 34 }}>
          <span style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>
            actually
          </span>
          <span
            style={{
              fontWeight: 700,
              letterSpacing: "-0.03em",
              backgroundColor: "#ddf94f",
              padding: "2px 5px",
              borderRadius: 6,
            }}
          >
            free
          </span>
          <span style={{ fontWeight: 700, letterSpacing: "-0.03em" }}>qr</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: "-0.045em",
            }}
          >
            QR codes that are
          </div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <span
              style={{
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: "-0.045em",
                backgroundColor: "#ddf94f",
                padding: "4px 14px",
                borderRadius: 12,
              }}
            >
              actually free.
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 34,
              color: "#66665f",
            }}
          >
            Type a name and a link. Share, print and bookmark it forever.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {PILLS.map((pill) => (
            <div
              key={pill}
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 600,
                padding: "12px 26px",
                borderRadius: 999,
                border: "2px solid #0e0e0d",
                backgroundColor: "#ffffff",
              }}
            >
              {pill}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
