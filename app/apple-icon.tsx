import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAF8F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div
            style={{
              width: 48,
              height: 78,
              background: "#D95C5C",
              transform: "skewY(-8deg)",
            }}
          />
          <div
            style={{
              width: 48,
              height: 70,
              background: "#F8D7D7",
              transform: "skewY(-8deg)",
              marginTop: -10,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
