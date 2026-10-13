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
          background: "#171717",
          color: "#FAF8F5",
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
              color: "#D95C5C",
            }}
          >
            USE PUBLIQUE
          </div>
          <div
            style={{
              fontSize: 78,
              lineHeight: 0.86,
              marginTop: 28,
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
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
            background: "#222222",
            color: "#FAF8F5",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            borderLeft: "1px solid #393431",
          }}
        >
          <div
            style={{
              fontSize: 20,
              letterSpacing: 6,
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
              color: "#F8D7D7",
            }}
          >
            001 / PRODUTO
          </div>
          <div
            style={{
              fontSize: 58,
              lineHeight: 0.86,
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
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
