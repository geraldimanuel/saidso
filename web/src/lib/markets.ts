"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { DECIMALS, MARKET_ADDRESS, marketAbi, Outcome, type Market, type Windows } from "./contract";

const H = 3600;
const PROD_WINDOWS: Windows = { resolve: 7 * 24 * H, dispute: 24 * H, arbiter: 3 * 24 * H };
const BASE = 1_793_000_000; // fixed so prerender and hydration agree
const demo = (id: number, question: string, dl: number, yes: string, no: string, outcome = 0): Market => ({
  id,
  question,
  deadline: BASE + dl,
  outcome,
  arbitrated: false,
  arbiter: `0x${"5a".repeat(20)}`,
  resolvedAt: outcome ? BASE + dl + H : 0,
  disputedAt: 0,
  windows: PROD_WINDOWS,
  yesPool: parseUnits(yes, DECIMALS),
  noPool: parseUnits(no, DECIMALS),
  creator: `0x${(id + 1).toString(16).padStart(4, "0")}${"a1".repeat(18)}` as Market["creator"],
});

// ponytail: shown only when NEXT_PUBLIC_MARKET_ADDRESS is unset, so the site demos without a deployment
export const DEMO_MARKETS: Market[] = [
  demo(0, "Will Budi be late to dinner on Friday?", 30 * H, "42", "18"),
  demo(1, "Will Sarah finish the marathon under 4 hours?", 70 * H, "60", "90"),
  demo(2, "Will the group trip actually happen this year?", 140 * H, "25", "110"),
  demo(3, "Will Andre's startup ship v1 before December?", 300 * H, "140", "35"),
  demo(4, "Will Kevin reply to the group chat within an hour?", -20 * H, "30", "50", Outcome.No),
  demo(5, "Will Mira beat everyone at karaoke night?", -60 * H, "80", "20", Outcome.Yes),
  demo(6, "Will Tom keep his gym streak for 30 days?", -90 * H, "15", "45", Outcome.Yes),
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
  const win = useReadContracts({
    contracts: (["RESOLVE_WINDOW", "DISPUTE_WINDOW", "ARBITER_WINDOW"] as const).map((functionName) => ({ address: MARKET_ADDRESS, abi: marketAbi, functionName })),
    query: { enabled, staleTime: Infinity }, // immutable
  });
  const [rw, dw, aw] = (win.data ?? []).map((r) => Number(r.result ?? 0n));
  const windows: Windows = { resolve: rw, dispute: dw, arbiter: aw };
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
    const markets = DEMO_MARKETS.map((m) => ({ ...m, deadline: m.deadline + shift, resolvedAt: m.resolvedAt && m.resolvedAt + shift }));
    return { markets, isDemo: true, isLoading: false, refetch: () => {} };
  }

  type Raw = Omit<Market, "id" | "windows" | "deadline" | "resolvedAt" | "disputedAt"> & Record<"deadline" | "resolvedAt" | "disputedAt", bigint>;
  const markets: Market[] = !win.data
    ? []
    : (reads.data ?? []).flatMap((r, id) => {
        if (r.status !== "success") return [];
        const x = r.result as Raw;
        return [{ ...x, id, windows, deadline: Number(x.deadline), resolvedAt: Number(x.resolvedAt), disputedAt: Number(x.disputedAt) }];
      });
  return {
    markets: markets.reverse(),
    isDemo: false,
    isLoading: count.isLoading || reads.isLoading || win.isLoading,
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
export type Phase = "open" | "awaiting" | "disputable" | "disputed" | "final";

/**
 * Mirrors PredictionMarket.finalOutcome(): which step a market is in, its final outcome
 * (Unresolved until final) and when the current window ends.
 */
export function phaseOf(m: Market, now: number | null): { phase: Phase; final: number; until?: number } {
  const t = now ?? 0;
  const w = m.windows;
  if (t < m.deadline) return { phase: "open", final: Outcome.Unresolved, until: m.deadline };
  if (m.outcome === Outcome.Unresolved) {
    const until = m.deadline + w.resolve; // creator never called it -> void
    return t >= until ? { phase: "final", final: Outcome.Invalid } : { phase: "awaiting", final: Outcome.Unresolved, until };
  }
  if (!m.disputedAt) {
    const until = m.resolvedAt + w.dispute; // nobody disputed in time -> creator's call stands
    return t >= until ? { phase: "final", final: m.outcome } : { phase: "disputable", final: Outcome.Unresolved, until };
  }
  if (m.arbitrated) return { phase: "final", final: m.outcome };
  const until = m.disputedAt + w.arbiter; // arbiter stayed silent -> void
  return t >= until ? { phase: "final", final: Outcome.Invalid } : { phase: "disputed", final: Outcome.Unresolved, until };
}

export function statusOf(m: Market, now: number | null): Status {
  const { phase } = phaseOf(m, now);
  return phase === "open" ? "open" : phase === "final" ? "settled" : "closed";
}

export function odds(m: Market) {
  const total = m.yesPool + m.noPool;
  const yes = total === 0n ? 50 : Number((m.yesPool * 1000n) / total) / 10;
  return { yes, no: Math.round((100 - yes) * 10) / 10, total };
}

/** Token base units -> "1,234.5 USDC". */
export const usdc = (v: bigint) => `${Number(formatUnits(v, DECIMALS)).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`;

export function timeLeft(deadline: number, now: number | null) {
  if (now === null) return "—";
  const s = deadline - now;
  if (s <= 0) return "Closed";
  if (s < 60) return "<1m";
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
