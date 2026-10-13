import { ImageResponse } from "next/og";

export const alt = "Publique — Da ideia à publicação";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F10239",
          color: "#E3D898",
        }}
      >
        <div
          style={{
            width: "58%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: 64,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
            }}
          >
            USE PUBLIQUE
          </div>
          <div
            style={{
              fontSize: 78,
              lineHeight: 0.86,
              marginTop: 28,
              fontFamily: "Impact, Arial Black, sans-serif",
              textTransform: "uppercase",
            }}
          >
            Da ideia à publicação.
          </div>
        </div>
        <div
          style={{
            width: "42%",
            height: "100%",
            background: "#E3D898",
            color: "#181818",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
            }}
          >
            001 / PRODUTO
          </div>
          <div
            style={{
              fontSize: 58,
              lineHeight: 0.86,
              fontFamily: "Impact, Arial Black, sans-serif",
              textTransform: "uppercase",
            }}
          >
            Sem complicação.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
