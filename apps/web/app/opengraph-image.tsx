import { ImageResponse } from "next/og";

export const alt = "Routiq — Expose localhost to the internet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3F0EE",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 90,
              height: 90,
              borderRadius: 20,
              backgroundColor: "#CF4500",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              width={48}
              height={48}
            >
              <path
                d="M4 12h16M12 4l8 8-8 8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#141413",
            }}
          >
            Routiq
          </span>
        </div>
        <p
          style={{
            marginTop: 32,
            fontSize: 32,
            color: "#141413",
            opacity: 0.7,
          }}
        >
          Expose localhost to the internet
        </p>
      </div>
    ),
    { ...size }
  );
}
