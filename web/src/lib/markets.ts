"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { MARKET_ADDRESS, marketAbi, Outcome, type Market } from "./contract";

const H = 3600;
const BASE = 1_793_000_000; // fixed so prerender and hydration agree
const demo = (id: number, question: string, dl: number, yes: string, no: string, outcome = 0): Market => ({
  id,
  question,
  deadline: BASE + dl,
  outcome,
  yesPool: parseEther(yes),
  noPool: parseEther(no),
  creator: `0x${(id + 1).toString(16).padStart(4, "0")}${"a1".repeat(18)}` as Market["creator"],
});

// ponytail: shown only when NEXT_PUBLIC_MARKET_ADDRESS is unset, so the site demos without a deployment
export const DEMO_MARKETS: Market[] = [
  demo(0, "Will Budi be late to dinner on Friday?", 30 * H, "0.42", "0.18"),
  demo(1, "Will Sarah finish the marathon under 4 hours?", 70 * H, "0.6", "0.9"),
  demo(2, "Will the group trip actually happen this year?", 140 * H, "0.25", "1.1"),
  demo(3, "Will Andre's startup ship v1 before December?", 300 * H, "1.4", "0.35"),
  demo(4, "Will Kevin reply to the group chat within an hour?", -20 * H, "0.3", "0.5", Outcome.No),
  demo(5, "Will Mira beat everyone at karaoke night?", -60 * H, "0.8", "0.2", Outcome.Yes),
  demo(6, "Will Tom keep his gym streak for 30 days?", -90 * H, "0.15", "0.45", Outcome.Yes),
];

export function useMarkets() {
  const enabled = !!MARKET_ADDRESS;
  const count = useReadContract({
    address: MARKET_ADDRESS,
    abi: marketAbi,
    functionName: "marketCount",
    query: { enabled },
  });
  const n = Number(count.data ?? 0n);
  const reads = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      address: MARKET_ADDRESS,
      abi: marketAbi,
      functionName: "getMarket",
      args: [BigInt(i)],
    })),
    query: { enabled: enabled && n > 0 },
  });

  const now = useNow();
  if (!enabled) {
    // demo deadlines stay relative to "now" so the demo never goes stale
    const shift = (now ?? BASE) - BASE;
    const markets = DEMO_MARKETS.map((m) => ({ ...m, deadline: m.deadline + shift }));
    return { markets, isDemo: true, isLoading: false, refetch: () => {} };
  }

  const markets: Market[] = (reads.data ?? []).flatMap((r, id) =>
    r.status === "success" ? [{ id, ...(r.result as Omit<Market, "id" | "deadline">), deadline: Number((r.result as { deadline: bigint }).deadline) }] : [],
  );
  return {
    markets: markets.reverse(),
    isDemo: false,
    isLoading: count.isLoading || reads.isLoading,
    refetch: () => {
      count.refetch();
      reads.refetch();
    },
  };
}

/** unix seconds; null until mounted so prerender and hydration agree */
export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export type Status = "open" | "closed" | "settled";

export function statusOf(m: Market, now: number | null): Status {
  if (m.outcome !== Outcome.Unresolved) return "settled";
  return now !== null && now >= m.deadline ? "closed" : "open";
}

export function odds(m: Market) {
  const total = m.yesPool + m.noPool;
  const yes = total === 0n ? 50 : Number((m.yesPool * 1000n) / total) / 10;
  return { yes, no: Math.round((100 - yes) * 10) / 10, total };
}

export const eth = (v: bigint) => `${Number(formatEther(v)).toLocaleString("en-US", { maximumFractionDigits: 3 })} ETH`;

export function timeLeft(deadline: number, now: number | null) {
  if (now === null) return "—";
  const s = deadline - now;
  if (s <= 0) return "Closed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const OUTCOME_LABEL = ["Pending", "Yes", "No", "Void"] as const;

/** `/markets/7-will-vani-be-accepted`: the leading number is the onchain id, the words are cosmetic. */
export function marketHref(m: Pick<Market, "id" | "question">) {
  const slug = m.question.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
  return `/markets/${m.id}${slug && `-${slug}`}`;
}

/** Market id from a slug segment, or null if it doesn't start with one. */
export const idFromSlug = (slug: string) => {
  const id = /^(\d+)(?:-|$)/.exec(slug)?.[1];
  return id === undefined ? null : Number(id);
};

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
