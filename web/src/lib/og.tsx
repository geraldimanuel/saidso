import type { CSSProperties, ReactNode } from "react";
import { createPublicClient, http } from "viem";
import { CHAIN, MARKET_ADDRESS, marketAbi, type Market } from "./contract";

/** Absolute site origin; WhatsApp and other crawlers ignore relative og:image URLs. */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const OG_SIZE = { width: 1200, height: 630 };

/** Google Fonts serves a TTF (which ImageResponse needs) when asked without a browser user agent. */
async function googleFont(family: string, weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`no TTF for ${family} ${weight}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

let fonts: ReturnType<typeof loadFonts> | undefined;
/** Fetched once per server instance, then reused by every image render. */
export const ogFonts = () => (fonts ??= loadFonts().catch((e) => ((fonts = undefined), Promise.reject(e))));

async function loadFonts() {
  const [syne, grotesk, mono] = await Promise.all([googleFont("Syne", 700), googleFont("Host Grotesk", 600), googleFont("Geist Mono", 400)]);
  return [
    { name: "Syne", data: syne, weight: 700 as const },
    { name: "Grotesk", data: grotesk, weight: 600 as const },
    { name: "Mono", data: mono, weight: 400 as const },
  ];
}

const plus = (pos: CSSProperties) => (
  <svg key={JSON.stringify(pos)} width="22" height="22" viewBox="0 0 13 13" style={{ position: "absolute", ...pos }}>
    <path d="M6.5 0v13M0 6.5h13" stroke="white" strokeWidth="1.3" />
  </svg>
);

/** Black canvas with the site's hairline X, centre rule and "+" corners. */
export function OgFrame({ children, lines = true }: { children: ReactNode; lines?: boolean }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#000", color: "#fff", fontFamily: "Mono" }}>
      {lines && (
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630 }}>
          <path d="M0 0L1200 630M1200 0L0 630M600 0V630" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" />
        </svg>
      )}
      {[{ left: 36, top: 36 }, { right: 36, top: 36 }, { left: 36, bottom: 36 }, { right: 36, bottom: 36 }].map(plus)}
      {children}
    </div>
  );
}

const client = createPublicClient({ chain: CHAIN, transport: http() });

/** One market plus the deployment's windows, read on the server (no multicall: anvil has no Multicall3). */
export async function readMarket(id: number): Promise<Market | null> {
  if (!MARKET_ADDRESS) return null;
  const read = <T,>(functionName: "getMarket" | "RESOLVE_WINDOW" | "DISPUTE_WINDOW" | "ARBITER_WINDOW", args?: readonly [bigint]) =>
    client.readContract({ address: MARKET_ADDRESS, abi: marketAbi, functionName, args } as never) as Promise<T>;
  try {
    const [m, rw, dw, aw] = await Promise.all([
      read<Omit<Market, "id" | "windows" | "deadline" | "resolvedAt" | "disputedAt"> & Record<"deadline" | "resolvedAt" | "disputedAt", bigint>>("getMarket", [BigInt(id)]),
      read<bigint>("RESOLVE_WINDOW"),
      read<bigint>("DISPUTE_WINDOW"),
      read<bigint>("ARBITER_WINDOW"),
    ]);
    return {
      ...m,
      id,
      deadline: Number(m.deadline),
      resolvedAt: Number(m.resolvedAt),
      disputedAt: Number(m.disputedAt),
      windows: { resolve: Number(rw), dispute: Number(dw), arbiter: Number(aw) },
    };
  } catch {
    return null; // MarketNotFound or RPC hiccup: callers fall back to the site banner/metadata
  }
}
