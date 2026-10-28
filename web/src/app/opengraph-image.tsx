import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogFonts, SITE_URL } from "@/lib/og";

export const alt = "Saidso: your friends' wildest takes, settled onchain";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Site banner: the landing hero, stacked so WhatsApp's centre-square crop still shows the whole wordmark. */
export default async function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 22, letterSpacing: 1, opacity: 0.85 }}>[ PREDICTION MARKETS · BASE ]</div>
          <div style={{ fontFamily: "Syne", fontSize: 140, lineHeight: 1, marginTop: 34, letterSpacing: 2 }}>SAIDSO</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 36, gap: 26 }}>
            <div style={{ fontSize: 86, fontWeight: 200, lineHeight: 1 }}>(</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Grotesk", fontSize: 34, lineHeight: 1.15, textTransform: "uppercase" }}>
              <span>Your friends&apos; wildest takes,</span>
              <span>settled onchain</span>
            </div>
            <div style={{ fontSize: 86, fontWeight: 200, lineHeight: 1 }}>)</div>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, display: "flex", justifyContent: "center", fontSize: 20, opacity: 0.6 }}>
          {SITE_URL.replace(/^https?:\/\//, "")}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
