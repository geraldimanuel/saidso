import { ImageResponse } from "next/og";
import { Outcome } from "@/lib/contract";
import { idFromSlug, odds, OUTCOME_LABEL, phaseOf, timeLeft, usdc } from "@/lib/market-math";
import { OG_SIZE, OgFrame, ogFonts, readMarket } from "@/lib/og";
import SiteImage from "../../opengraph-image";

export const alt = "A Saidso market: the question, live odds and pot";
export const size = OG_SIZE;
export const contentType = "image/png";

const YES = "#c8ff5a"; // --color-yes
const NO = "#ff6b5a"; // --color-no

/** Market card: the live question, odds bar and pot, centred so a square crop keeps the question. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const id = idFromSlug((await params).slug);
  const m = id === null ? null : await readMarket(id);
  if (!m) return SiteImage();

  const now = Math.floor(Date.now() / 1000);
  const { phase, final } = phaseOf(m, now);
  const o = odds(m);
  const status =
    phase === "open"
      ? `OPEN · ${timeLeft(m.deadline, now).toUpperCase()} LEFT`
      : phase === "final"
        ? `SETTLED · ${OUTCOME_LABEL[final].toUpperCase()}`
        : phase === "disputed"
          ? "DISPUTED"
          : phase === "disputable"
            ? `CALLED ${OUTCOME_LABEL[m.outcome].toUpperCase()}`
            : "CLOSED";
  const q = m.question.toUpperCase();
  const qSize = q.length <= 40 ? 66 : q.length <= 80 ? 52 : 40;

  return new ImageResponse(
    (
      <OgFrame lines={false}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, padding: "70px 90px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22 }}>
            <span>[ MARKET #{String(m.id).padStart(2, "0")} ]</span>
            <span style={{ color: phase === "open" ? YES : phase === "disputed" ? NO : "#fff" }}>[ {status} ]</span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: "Grotesk", fontSize: qSize, lineHeight: 1.12 }}>{q}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 30 }}>
              <span style={{ color: YES }}>YES {o.yes}%</span>
              <div style={{ display: "flex", flex: 1, height: 14, background: NO }}>
                <div style={{ width: `${o.yes}%`, height: "100%", background: YES }} />
              </div>
              <span style={{ color: NO }}>NO {o.no}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24 }}>
              <span>POT {usdc(o.total)}</span>
              <span style={{ fontFamily: "Syne", fontSize: 30 }}>SAIDSO</span>
              <span>{phase === "open" ? "PLACE YOUR CALL →" : final === Outcome.Invalid ? "REFUNDED" : "SEE WHO CALLED IT →"}</span>
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
